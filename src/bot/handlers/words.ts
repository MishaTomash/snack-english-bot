import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRandomWords } from '../../services/wordService';

export const handleWords = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
        const user = await User.findOne({ telegramId });

        if (!user || !user.level) {
            if (ctx.callbackQuery) await ctx.answerCallbackQuery();
            return ctx.reply('Будь ласка, спочатку обери свій рівень за допомогою команди /start');
        }

        // Отримуємо слова. Припускаємо, що сервіс все ще повертає масив.
        const words = await getRandomWords(user.level);

        if (!words || words.length === 0) {
            if (ctx.callbackQuery) await ctx.answerCallbackQuery();
            return ctx.reply('На жаль, для твого рівня поки немає слів у базі 😔');
        }

        // Беремо лише одне випадкове слово з масиву
        const word = words[0];

        // Формуємо повідомлення для одного слова
        const message = `📚 **Твоє слово на сьогодні (Рівень ${user.level}):**\n\n` +
                        `🇺🇦 ${word.ukrainian}\n` +
                        `🇬🇧 ${word.english}\n` +
                        `🔤 ${word.transcription}`;

        // Оновлюємо статистику користувача (+1 слово)
        user.wordsLearned = (user.wordsLearned || 0) + 1;
        user.wordsLearnedToday = (user.wordsLearnedToday || 0) + 1;
        user.lastWordLearnDate = new Date(); 

        await user.save();

        // Створюємо інлайн-кнопку
        const keyboard = new InlineKeyboard()
            .text('➡️ Наступне слово', 'next_word');

        // Перевіряємо, звідки прийшов запит
        if (ctx.callbackQuery) {
            // Якщо натиснули кнопку — оновлюємо існуюче повідомлення
            await ctx.editMessageText(message, { 
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
            await ctx.answerCallbackQuery(); // Обов'язково закриваємо callback, щоб кнопка не "висіла"
        } else {
            // Якщо викликали з меню/команди — надсилаємо нове повідомлення
            await ctx.reply(message, { 
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
    } catch (error: any) {
        // Перевіряємо, чи це помилка "message is not modified" від Telegram
        if (error.description && error.description.includes('message is not modified')) {
            if (ctx.callbackQuery) {
                // Показуємо користувачу маленьке спливаюче вікно
                await ctx.answerCallbackQuery('Випало те ж саме слово! Тисни ще раз 😅');
            }
            return; // Зупиняємо виконання, щоб не видавало "Вибач, сталася помилка"
        }

        // Якщо це якась інша серйозна помилка
        console.error('Помилка при видачі слів:', error);
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();
        await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.');
    }

};