import { Context, NextFunction } from 'grammy';
import { User } from '../../models/User';

// Встановлюємо ліміт для безкоштовної версії
const FREE_WORDS_LIMIT = 15;

export const checkWordLimits = async (ctx: Context, next: NextFunction) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return await next();

    const user = await User.findOne({ telegramId });
    if (!user) return await next();

    // Якщо користувач має Premium — пропускаємо без жодних обмежень
    if (user.isPremium) {
        return await next();
    }

    const now = new Date();
    const lastLearn = user.lastWordLearnDate || new Date(0);

    // Скидаємо час, щоб порівняти саме дати (дні)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLearnDay = new Date(lastLearn.getFullYear(), lastLearn.getMonth(), lastLearn.getDate());

    // Якщо користувач востаннє вчив слова вчора (або раніше) — скидаємо лічильник
    if (today.getTime() > lastLearnDay.getTime()) {
        user.wordsLearnedToday = 0;
        user.lastWordLearnDate = now;
        await user.save();
    }

    // Перевіряємо, чи не перевищено ліміт
    if (user.wordsLearnedToday >= FREE_WORDS_LIMIT) {
        return ctx.reply(
            `🛑 Ти вичерпав свій денний ліміт для безкоштовної версії (*${FREE_WORDS_LIMIT} слів*).\n\n` +
            `💎 Оформи Premium, щоб вчити необмежену кількість слів та отримати доступ до складних текстів: /premium`,
            { parse_mode: 'Markdown' }
        );
    }

    // Якщо ліміт не вичерпано — передаємо управління далі до команди видачі слів
    await next();
};