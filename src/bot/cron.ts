import cron from 'node-cron';
import { Bot } from 'grammy';
import { GrammyError } from 'grammy';
import { User } from '../models/User';

export const startCronJobs = (bot: Bot) => {
    cron.schedule('0 18 * * *', async () => {
        console.log('⏰ Cron: перевіряємо користувачів для нагадувань...');

        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        // Шукаємо юзерів, які були активні ДАВНІШЕ ніж вчора, 
        // не заблоковані, і яким ми ще НЕ НАГАДУВАЛИ сьогодні
        const usersToRemind = await User.find({
            lastActive: { $lt: yesterday },
            isBlocked: { $ne: true }, // Пропускаємо вже заблокованих
            $or: [
                { lastRemindedAt: { $exists: false } },
                { lastRemindedAt: { $lt: yesterday } } // Щоб не спамити двічі за день
            ]
        });

        console.log(`📋 Знайдено ${usersToRemind.length} користувачів для нагадування`);

        let sent = 0;
        let blocked = 0;
        let failed = 0;

        for (const user of usersToRemind) {
            try {
                await bot.api.sendMessage(
                    user.telegramId,
                    '🔥 *Гей! Твій вогник активності згасає!*\n' +
                    'Зайди в бот і вивчи хоча б одне слово, щоб врятувати свою серію! 📚',
                    { parse_mode: 'Markdown' }
                );
                sent++;
            } catch (err) {
                if (err instanceof GrammyError && err.error_code === 403) {
                    console.warn(`🚫 Юзер ${user.telegramId} заблокував бота. Позначаємо.`);
                    user.isBlocked = true;
                    blocked++;
                } else {
                    console.error(`❌ Помилка надсилання юзеру ${user.telegramId}:`, err);
                    failed++;
                }
            } finally {
                // 👈 Оновлюємо лише дату нагадування, а не реальну активність юзера
                user.lastRemindedAt = new Date(); 
                await user.save();

                // ⚠️ НАЙВАЖЛИВІШЕ: Затримка, щоб не покласти базу і Telegram!
                await new Promise(res => setTimeout(res, 50)); 
            }
        }

        console.log(`✅ Cron завершено: надіслано ${sent}, заблоковано ${blocked}, помилок ${failed}`);
    });
};