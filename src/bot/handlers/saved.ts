import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';

// Головна функція для запуску Словничка
export const handleSavedWords = async (ctx: Context) => {
    await showSavedWordAtIndex(ctx, 0);
};

// Обробник кнопки "Наступне"
export const handleNextSavedWord = async (ctx: Context) => {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    // Дістаємо індекс наступного слова з callback_data
    const nextIndex = parseInt(callbackData.split('_')[2]) || 0;
    await showSavedWordAtIndex(ctx, nextIndex);
};

// Обробник кнопки "Видалити"
export const handleDeleteSavedWord = async (ctx: Context) => {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;
    const telegramId = ctx.from?.id;
    const wordId = callbackData.split('_')[2];

    try {
        const user = await User.findOne({ telegramId });

        // 🧹 ОЧИЩЕННЯ ЧАТУ: Видаляємо старе аудіо перед видаленням слова
        if (user && user.lastAudioMessageId) {
            await ctx.api.deleteMessage(ctx.chat!.id, user.lastAudioMessageId).catch(() => {});
            user.lastAudioMessageId = null;
            await user.save();
        }

        // Видаляємо слово з масиву збережених у користувача
        await User.updateOne(
            { telegramId },
            { $pull: { savedWords: wordId } }
        );

        // Перевіряємо, чи залишилися ще слова
        const updatedUser = await User.findOne({ telegramId });
        if (!updatedUser || updatedUser.savedWords.length === 0) {
            await ctx.answerCallbackQuery('🗑 Слово видалено! Словничок тепер порожній.');
            await ctx.editMessageText('Ваш словничок тепер порожній 😔\n\nЗберігайте слова під час навчання, щоб повторювати їх тут!');
            return;
        }

        await ctx.answerCallbackQuery('🗑 Слово видалено!');
        // Після видалення показуємо найперше слово зі списку, що залишився
        await showSavedWordAtIndex(ctx, 0);
    } catch (error) {
        console.error('Помилка при видаленні збереженого слова:', error);
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    }
};

// Внутрішня функція для відображення конкретного слова
const showSavedWordAtIndex = async (ctx: Context, index: number) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
        // Завантажуємо користувача і одразу "розпаковуємо" його збережені слова (populate)
        const user = await User.findOne({ telegramId }).populate('savedWords');

        if (!user || !user.savedWords || user.savedWords.length === 0) {
            const msg = 'Ваш словничок порожній 😔\n\nЗберігайте нові слова під час навчання!';
            if (ctx.callbackQuery) {
                return ctx.editMessageText(msg);
            }
            return ctx.reply(msg);
        }

        // 🧹 ОЧИЩЕННЯ ЧАТУ: Видаляємо старе аудіо, коли користувач переходить до наступного слова в Словничку
        if (user.lastAudioMessageId) {
            await ctx.api.deleteMessage(ctx.chat!.id, user.lastAudioMessageId).catch(() => {});
            user.lastAudioMessageId = null;
            await user.save(); // Зберігаємо статус очищеного аудіо
        }

        // Якщо індекс вийшов за межі масиву (користувач догортав до кінця), починаємо з початку
        let safeIndex = index;
        if (safeIndex >= user.savedWords.length || safeIndex < 0) {
            safeIndex = 0;
        }

        const word: any = user.savedWords[safeIndex];
        // Адаптація під поля бази даних
        const english = word.englishText || word.english;
        const ukrainian = word.ukrainianTranslation || word.ukrainian;
        const transcription = word.transcription;

        const message = `📚 *Ваш словничок (${safeIndex + 1}/${user.savedWords.length}):*\n\n` +
            `🇺🇦 ${ukrainian}\n` +
            `🇬🇧 ${english}\n` +
            `🔤 ${transcription}`;

        const nextIndex = safeIndex + 1;

        // Клавіатура з озвучкою, видаленням та гортанням
        const keyboard = new InlineKeyboard()
            .text('🔊 Слухати вимову', `audio_${english}`)
            .row()
            .text('❌ Видалити', `del_saved_${word._id}`)
            .text('➡️ Наступне', `next_saved_${nextIndex}`);

        if (ctx.callbackQuery) {
            try {
                await ctx.editMessageText(message, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
                await ctx.answerCallbackQuery();
            } catch (error: any) {
                // Перехоплюємо помилку, якщо випало те ж саме повідомлення (наприклад, коли слово лише одне)
                if (error.description && error.description.includes('message is not modified')) {
                    await ctx.answerCallbackQuery('Ви переглянули всі слова! Починаємо спочатку 🔄');
                } else {
                    console.error('Помилка при оновленні тексту повідомлення:', error);
                }
            }
        } else {
            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    } catch (error) {
        console.error('Помилка у функції showSavedWordAtIndex:', error);
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    }
};

// Обробник для збереження слова
export const handleSaveWord = async (ctx: Context) => {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    const wordId = callbackData.split('_')[2];
    const telegramId = ctx.from?.id;

    try {
        await User.updateOne(
            { telegramId },
            { $addToSet: { savedWords: wordId } }
        );
        await ctx.answerCallbackQuery('✅ Слово збережено у ваш Словничок!');
    } catch (error) {
        console.error('Помилка при збереженні слова:', error);
        await ctx.answerCallbackQuery({ 
            text: '❌ Не вдалося зберегти слово.', 
            show_alert: true 
        });
    }
};