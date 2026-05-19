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
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();
        return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
    }

    const textData = await getRandomText(user);
    if (!textData) {
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();
        return ctx.reply('На жаль, для твого рівня поки немає текстів 😔');
    }

    const message = `🇬🇧 **Read and translate:**\n\n_${textData.englishText}_`;
    const keyboard = createTextKeyboard(textData._id.toString());

    // Якщо це натискання на кнопку "Інший текст" або "Тексти для перекладу"
    if (ctx.callbackQuery) {
        try {
            await ctx.editMessageText(message, {
                reply_markup: keyboard,
                parse_mode: 'Markdown',
            });
            await ctx.answerCallbackQuery(); 
        } catch (error: any) {
            // Перевіряємо, чи це помилка "текст не змінився"
            if (error.description && error.description.includes('message is not modified')) {
                await ctx.answerCallbackQuery('🎲 Випав той самий текст. Натисни ще раз!');
            } else {
                console.error('❌ Помилка редагування повідомлення (тексти):', error);
                await ctx.answerCallbackQuery('Виникла помилка 😔'); 
            }
        }
    } else {
        // Якщо це виклик через команду /text або звичайне текстове меню
        await ctx.reply(message, {
            reply_markup: keyboard,
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

    // Підготовка до фічі "Мій профіль": тут можна зберігати прогрес
    // await User.findOneAndUpdate({ telegramId: ctx.from?.id }, { $inc: { textsRead: 1 } });

    try {
        await ctx.editMessageText(message, {
            // Залишаємо тільки кнопку "Інший текст"
            reply_markup: new InlineKeyboard().text('🔄 Інший текст', 'next_text'),
            parse_mode: 'Markdown',
        });
        await ctx.answerCallbackQuery();
    } catch (error: any) {
        console.error('❌ Помилка показу перекладу:', error);
        await ctx.answerCallbackQuery('Сталася помилка при показі перекладу.');
    }
};