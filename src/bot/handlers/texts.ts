import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRandomText, getTextById } from '../../services/textService';
import { createTextKeyboard } from '../keyboards/text';

// Функція для відправки тексту (використовується і для команди, і для кнопки)
export const sendRandomText = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    if (!user || !user.level) {
        return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
    }

    const textData = await getRandomText(user.level);
    if (!textData) {
        return ctx.reply('На жаль, для твого рівня поки немає текстів 😔');
    }

    const message = `🇬🇧 **Read and translate:**\n\n_${textData.englishText}_`;

    // Якщо це натискання на кнопку "Інший текст", ми редагуємо поточне повідомлення
    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(message, {
                reply_markup: createTextKeyboard(textData._id.toString()),
                parse_mode: 'Markdown',
            });
            await ctx.answerCallbackQuery().catch(() => console.log('⏳ Пропущено старий callback_query'));
        } catch (error: any) {
            // Перевіряємо, чи це помилка "текст не змінився"
            if (error.description && error.description.includes('message is not modified')) {
                await ctx.answerCallbackQuery({ text: '🎲 Випав той самий текст. Натисни ще раз!' });
            } else {
                // Якщо сталася якась інша помилка
                console.error('❌ Помилка редагування повідомлення:', error);
                await ctx.answerCallbackQuery().catch(() => { }); // Відповідаємо, щоб кнопка не висіла
            }
        }
    } else {
        // Якщо це виклик через команду /text
        await ctx.reply(message, {
            reply_markup: createTextKeyboard(textData._id.toString()),
            parse_mode: 'Markdown',
        });
    }
};

// Функція для показу перекладу
export const handleShowTranslation = async (ctx: Context) => {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    // Дістаємо ID тексту з callback_data (наприклад, з 'trans_64b1f...')
    const textId = callbackData.split('_')[1];
    const textData = await getTextById(textId);

    if (!textData) {
        return ctx.answerCallbackQuery({ text: 'Текст не знайдено 😔', show_alert: true });
    }

    const message = `🇬🇧 **Англійською:**\n_${textData.englishText}_\n\n🇺🇦 **Переклад:**\n_${textData.ukrainianTranslation}_`;

    await ctx.editMessageText(message, {
        // Залишаємо тільки кнопку "Інший текст"
        reply_markup: new InlineKeyboard().text('🔄 Інший текст', 'next_text'),
        parse_mode: 'Markdown',
    });
    await ctx.answerCallbackQuery().catch(() => console.log('⏳ Пропущено старий callback_query'));
};