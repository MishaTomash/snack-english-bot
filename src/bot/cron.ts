import cron from 'node-cron';
import { Bot } from 'grammy';
import { User } from '../models/User';

export const startCronJobs = (bot: Bot) => {
    // Запускаємо щодня о 18:00 (можеш змінити час)
    cron.schedule('0 18 * * *', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Шукаємо користувачів, які були активні вчора, але НЕ сьогодні
        const usersToRemind = await User.find({
            lastActivityDate: { $lt: yesterday }
        });

        for (const user of usersToRemind) {
            try {
                await bot.api.sendMessage(user.telegramId, 
                    '🔥 *Гей! Твій вогник активності згасає!*\n' +
                    'Зайди в бот і вивчи хоча б одне слово, щоб врятувати свою серію! 📚'
                , { parse_mode: 'Markdown' });
            } catch (err) {
                console.error(`Не вдалося надіслати нагадування юзеру ${user.telegramId}`);
            }
        }
    });
};