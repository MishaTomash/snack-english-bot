import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRandomWords } from '../../services/wordService';
import { getAudioUrl } from '../../services/audioService'; // Імпортуємо сервіс озвучки
import { updateUserProgress } from '../../services/progressService'; // Сервіс прогресу

export const handleWords = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
        const user = await User.findOne({ telegramId });

        if (!user || !user.level) {
            if (ctx.callbackQuery) await ctx.answerCallbackQuery();
            return ctx.reply('Будь ласка, спочатку обери свій рівень за допомогою команди /start');
        }

        // 🧹 ОЧИЩЕННЯ ЧАТУ: Видаляємо старе аудіо, якщо користувач перейшов до наступного слова
        if (user.lastAudioMessageId) {
            await ctx.api.deleteMessage(ctx.chat!.id, user.lastAudioMessageId).catch(() => {
                // Сховище Telegram могло застаріти, або користувач сам видалив, тому просто ігноруємо помилку
            });
            user.lastAudioMessageId = null;
            await user.save(); // Зберігаємо статус очищеного аудіо
        }

        const words = await getRandomWords(user.level);

        if (!words || words.length === 0) {
            if (ctx.callbackQuery) await ctx.answerCallbackQuery();
            return ctx.reply('На жаль, для твого рівня поки немає слів у базі 😔');
        }

        const word = words[0];

        const message = `📚 *Твоє слово на сьогодні (Рівень ${user.level}):*\n\n` +
            `🇺🇦 ${word.ukrainian}\n` +
            `🇬🇧 ${word.english}\n` +
            `🔤 ${word.transcription}`;

        // Створюємо клавіатуру: кнопка озвучки + кнопки збереження та наступного слова
        const keyboard = new InlineKeyboard()
            .text('🔊 Слухати вимову', `audio_${word.english}`)
            .row()
            .text('💾 Зберегти', `save_word_${word._id}`)
            .text('➡️ Наступне слово', 'next_word');

        // Відправляємо або редагуємо повідомлення
        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
            await ctx.answerCallbackQuery();
        } else {
            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }

        // 🔥 МАГІЯ ПРОГРЕСУ: Оновлюємо статистику та вогники через єдиний сервіс!
        await updateUserProgress(telegramId, 'word', word._id.toString());

    } catch (error: any) {
        if (error.description && error.description.includes('message is not modified')) {
            if (ctx.callbackQuery) {
                await ctx.answerCallbackQuery('Випало те ж саме слово! Тисни ще раз 😅');
            }
            return;
        }

        console.error('Помилка при видачі слів:', error);
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();
        await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.');
    }
};

// Обробник для кнопки озвучки слів з контролем спаму
export const handleWordAudio = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData || !telegramId) return;

    const wordToPronounce = callbackData.split('_')[1];

    try {
        const user = await User.findOne({ telegramId });

        // 🧹 ОЧИЩЕННЯ ЧАТУ: Якщо вже є надіслане аудіо, видаляємо його перед надсиланням нового
        if (user && user.lastAudioMessageId) {
            await ctx.api.deleteMessage(ctx.chat!.id, user.lastAudioMessageId).catch(() => { });
        }

        const audioUrl = getAudioUrl(wordToPronounce);

        // Надсилаємо нове аудіо
        const audioMessage = await ctx.replyWithVoice(audioUrl, {
            caption: `🔊 Вимова слова: *${wordToPronounce}*`,
            parse_mode: 'Markdown'
        });

        // Запам'ятовуємо ID свіжого повідомлення, щоб видалити його наступного разу
        if (user) {
            user.lastAudioMessageId = audioMessage.message_id;
            await user.save();
        }

        await ctx.answerCallbackQuery();
    } catch (error) {
        console.error('Помилка при надсиланні аудіо:', error);
        await ctx.answerCallbackQuery({
            text: '❌ Не вдалося завантажити озвучку',
            show_alert: true
        });
    }
};