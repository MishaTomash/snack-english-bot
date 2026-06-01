import { Context, NextFunction } from 'grammy';
import { GrammyError } from 'grammy';
import { User } from '../../models/User';

export const trackActivity = async (ctx: Context, next: NextFunction) => {
    const telegramId = ctx.from?.id;

    if (telegramId) {
        const user = await User.findOne({ telegramId });

        if (user) {
            const now = new Date();
            const lastActive = user.lastActive || new Date(0);

            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

            const diffTime = Math.abs(today.getTime() - lastActiveDay.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                user.streak = (user.streak || 0) + 1;
            } else if (diffDays > 1) {
                user.streak = 1;
            } else if (!user.streak) {
                user.streak = 1;
            }

            user.lastActive = now;
            await user.save();
        }
    }

    try {
        await next();
    } catch (err) {
        if (err instanceof GrammyError && err.error_code === 403) {
            // Користувач заблокував бота — логуємо та ігноруємо
            console.warn(`⚠️ Бот не зміг надіслати повідомлення, бо користувач (ID: ${ctx.from?.id}) заблокував його.`);
        } else {
            // Всі інші помилки — пробрасуємо далі
            throw err;
        }
    }
};