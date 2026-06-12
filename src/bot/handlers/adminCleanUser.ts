
import { Context } from 'grammy';
import { User } from '../../models/User';

export const handleClearBlockedUsers = async (ctx: Context) => {
    try {
        // Рахуємо скільки таких є в базі перед видаленням
        const blockedCount = await User.countDocuments({ isBlocked: true });

        if (blockedCount === 0) {
            return await ctx.reply('✨ База даних чиста! Немає заблокованих користувачів для видалення.');
        }

        // Видаляємо одним запитом усіх, у кого flag isBlocked дорівнює true
        await User.deleteMany({ isBlocked: true });

        console.log(`🧹 Адмін очистив базу: видалено ${blockedCount} заблокованих юзерів.`);
        
        await ctx.reply(`✅ Успішно видалено <b>${blockedCount}</b> користувачів, які заблокували бота!`, {
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('Помилка під час видалення заблокованих користувачів:', error);
        await ctx.reply('❌ Сталася помилка при спробі очистити базу.');
    }
};