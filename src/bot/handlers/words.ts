import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRandomWords } from '../../services/wordService';
import { getAudioUrl } from '../../services/audioService';
import { updateUserProgress } from '../../services/progressService';

export const handleWords = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // ✅ ПРАВИЛО №1: answerCallbackQuery — ЗАВЖДИ ПЕРШИМ, до будь-яких БД запитів.
  // Telegram дає лише 10 секунд. БД + delete + aggregate можуть зайняти більше.
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery().catch(() => {});
  }

  try {
    const user = await User.findOne({ telegramId });

    if (!user || !user.level) {
      return ctx.reply('Будь ласка, спочатку обери свій рівень за допомогою команди /start');
    }

    // 🧹 Видаляємо попереднє аудіо (після answerCallbackQuery — не критично по часу)
    if (user.lastAudioMessageId && ctx.chat?.id) {
      await ctx.api
        .deleteMessage(ctx.chat.id, user.lastAudioMessageId)
        .catch(() => {});

      await User.findByIdAndUpdate(user._id, {
        $set: { lastAudioMessageId: null },
      });
    }

    const words = await getRandomWords(user, 1);

    if (!words || words.length === 0) {
      return ctx.reply('На жаль, для твого рівня поки немає слів у базі 😔');
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
      }).catch(async (error: any) => {
        // Якщо текст не змінився — просто показуємо тост, не падаємо
        if (error?.description?.includes('message is not modified')) {
          await ctx.answerCallbackQuery('Випало те ж саме слово! Тисни ще раз 😅').catch(() => {});
        }
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }

    await updateUserProgress(telegramId, 'word', word._id.toString());

  } catch (error: any) {
    console.error('Помилка при видачі слів:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.').catch(() => {});
  }
};

// 🔊 Обробник кнопки озвучки
export const handleWordAudio = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !telegramId) return;

  // ✅ answerCallbackQuery — одразу, до будь-яких запитів
  await ctx.answerCallbackQuery().catch(() => {});

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

    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $set: { lastAudioMessageId: audioMessage.message_id },
      });
    }

  } catch (error) {
    console.error('Помилка при надсиланні аудіо:', error);
    // answerCallbackQuery вже викликано вище, тут лише логуємо
  }
};