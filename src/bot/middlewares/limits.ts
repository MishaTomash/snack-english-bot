import { Context, NextFunction, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { updateUserProgress } from '../../services/progressService';

const FREE_WORDS_LIMIT = 9999;
export const checkWordLimits = async (ctx: Context, next: NextFunction) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return await next();

    // 🌟 ДОДАНО: Зберігаємо попереднє слово ДО перевірки лімітів!
    if (ctx.callbackQuery?.data?.startsWith('next_word_')) {
        const previousWordId = ctx.callbackQuery.data.replace('next_word_', '');
        if (previousWordId && previousWordId !== 'next_word') {
            // Зберігаємо прогрес для слова, яке юзер щойно вивчив
            await updateUserProgress(telegramId, 'word', previousWordId);
            await User.findOneAndUpdate(
                { telegramId },
                { $addToSet: { seenWords: previousWordId } }
            );
        }
    }

    const user = await User.findOne({ telegramId });
    if (!user) return await next();

    // Якщо користувач має Premium — пропускаємо без жодних обмежень
    if (user.isPremium) {
        return await next();
    }

    const now = new Date();
    const lastLearn = user.lastWordLearnDate || new Date(0);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLearnDay = new Date(lastLearn.getFullYear(), lastLearn.getMonth(), lastLearn.getDate());

    // Якщо почався новий день — скидаємо лічильник
    if (today.getTime() > lastLearnDay.getTime()) {
        user.wordsLearnedToday = 0;
        await user.save();
    }

    // Перевіряємо ліміт (він вже враховує +1 слово, яке ми щойно зберегли)
    if (user.wordsLearnedToday >= FREE_WORDS_LIMIT) {
        const message = `🛑 Ти вичерпав свій денний ліміт для безкоштовної версії (*${FREE_WORDS_LIMIT} слів*).\n\n` +
                        `💎 Оформи Premium, щоб вчити необмежену кількість слів, отримувати озвучку та мати доступ до всіх функцій!`;
        
        const keyboard = new InlineKeyboard().text('💎 Отримати Premium', 'open_premium_menu');

        // Якщо користувач клікнув інлайн-кнопку "Наступне слово"
        if (ctx.callbackQuery) {
            await ctx.answerCallbackQuery({ text: 'Денний ліміт вичерпано 🛑', show_alert: true });
            return await ctx.editMessageText(message, { 
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }

        // Якщо користувач викликав через меню / команду
        return await ctx.reply(message, { 
            parse_mode: 'Markdown',
            reply_markup: keyboard 
        });
    }

    // Якщо ліміт не вичерпано — передаємо управління далі (до handleWords)
    await next();
}