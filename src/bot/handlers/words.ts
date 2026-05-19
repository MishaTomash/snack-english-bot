import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRandomWords } from '../../services/wordService';
import { getAudioUrl } from '../../services/audioService';
import { updateUserProgress } from '../../services/progressService';

export const handleWords = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  try {
    const user = await User.findOne({ telegramId });

    if (!user || !user.level) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery();
      return ctx.reply(
        'Будь ласка, спочатку обери свій рівень за допомогою команди /start',
      );
    }

    // 🧹 Видаляємо попереднє аудіо одним запитом, без зайвого user.save()
    if (user.lastAudioMessageId && ctx.chat?.id) {
      await ctx.api
        .deleteMessage(ctx.chat.id, user.lastAudioMessageId)
        .catch(() => {
          // Повідомлення могло вже бути видалено — ігноруємо
        });

      // Очищуємо одразу в БД, не через user.save() щоб уникнути конфліктів
      await User.findByIdAndUpdate(user._id, {
        $set: { lastAudioMessageId: null },
      });
    }

    // ✅ Передаємо весь об'єкт user, а не user.level
    const words = await getRandomWords(user, 1);

    if (!words || words.length === 0) {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery();
      return ctx.reply(
        'На жаль, для твого рівня поки немає слів у базі 😔',
      );
    }

    const word = words[0];

    const message =
      `📚 *Твоє слово на сьогодні (Рівень ${user.level}):*\n\n` +
      `🇺🇦 ${word.ukrainian}\n` +
      `🇬🇧 ${word.english}\n` +
      `🔤 ${word.transcription}`;

    const keyboard = new InlineKeyboard()
      .text('🔊 Слухати вимову', `audio_${word.english}`)
      .row()
      .text('💾 Зберегти', `save_word_${word._id}`)
      .text('➡️ Наступне слово', 'next_word');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
      await ctx.answerCallbackQuery();
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }

    await updateUserProgress(telegramId, 'word', word._id.toString());
  } catch (error: any) {
    // Telegram кидає цю помилку якщо текст повідомлення не змінився
    if (error?.description?.includes('message is not modified')) {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery(
          'Випало те ж саме слово! Тисни ще раз 😅',
        );
      }
      return;
    }

    console.error('Помилка при видачі слів:', error);
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.');
  }
};

// 🔊 Обробник кнопки озвучки — видаляє попереднє аудіо перед надсиланням нового
export const handleWordAudio = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !telegramId) return;

  // callbackData має формат "audio_hello" → беремо все після першого "_"
  const wordToPronounce = callbackData.substring('audio_'.length);

  try {
    const user = await User.findOne({ telegramId });

    // 🧹 Видаляємо попереднє аудіо якщо є
    if (user?.lastAudioMessageId && ctx.chat?.id) {
      await ctx.api
        .deleteMessage(ctx.chat.id, user.lastAudioMessageId)
        .catch(() => {});
    }

    const audioUrl = getAudioUrl(wordToPronounce);

    const audioMessage = await ctx.replyWithVoice(audioUrl, {
      caption: `🔊 Вимова слова: *${wordToPronounce}*`,
      parse_mode: 'Markdown',
    });

    // Зберігаємо ID нового аудіо-повідомлення
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $set: { lastAudioMessageId: audioMessage.message_id },
      });
    }

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('Помилка при надсиланні аудіо:', error);
    await ctx.answerCallbackQuery({
      text: '❌ Не вдалося завантажити озвучку',
      show_alert: true,
    });
  }
};