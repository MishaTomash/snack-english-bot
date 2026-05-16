import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRandomTest } from '../../services/testService';
import { createTestKeyboard } from '../keyboards/test';

// Видача тесту
export const sendRandomTest = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    if (!user || !user.level) {
        return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
    }

    const testData = await getRandomTest(user.level);
    if (!testData) {
        return ctx.reply('На жаль, для твого рівня поки немає тестів 😔');
    }

    const message = `🧠 *Міні-тест*\n\n${testData.question}`;

    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(message, {
                reply_markup: createTestKeyboard(testData._id.toString(), testData.options, testData.correctOptionIndex),
                parse_mode: 'Markdown',
            });
        } catch (error: any) {
            if (error.description?.includes('message is not modified')) {
                await ctx.answerCallbackQuery({ text: '🎲 Випало те саме питання!', show_alert: false }).catch(() => { });
                return;
            }
        }
        await ctx.answerCallbackQuery().catch(() => { });
    } else {
        await ctx.reply(message, {
            reply_markup: createTestKeyboard(testData._id.toString(), testData.options, testData.correctOptionIndex),
            parse_mode: 'Markdown',
        });
    }
};

// Обробка відповіді
export const handleTestAnswer = async (ctx: Context) => {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    const parts = callbackData.split('_');
    const isCorrect = parts[2] === '1'; // Перевіряємо наш прапорець

    if (isCorrect) {
        await ctx.answerCallbackQuery({ text: '✅ Правильно! Молодець!', show_alert: true });

        const user = await User.findOne({ telegramId: ctx.from?.id });
        if (user) {
            user.testsPassed = (user.testsPassed || 0) + 1;
            await user.save();
        }
    } else {
        await ctx.answerCallbackQuery({ text: '❌ Неправильно. Спробуй ще раз!', show_alert: true });
    }

    // Замінюємо клавіатуру на кнопку "Наступне питання", щоб не можна було клікати безкінечно
    const nextKeyboard = new InlineKeyboard().text('🔄 Наступне питання', 'next_test');
    await ctx.editMessageReplyMarkup({ reply_markup: nextKeyboard }).catch(() => console.log('⏳ Пропущено оновлення клавіатури'));
};