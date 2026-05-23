import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRandomWords } from '../../services/wordService';
import { getAudioUrl } from '../../services/audioService';
import { updateUserProgress } from '../../services/progressService';
import { checkAndRewardReferrer } from './referrals';

// ─── Константи ────────────────────────────────────────────────────────────────

const DAILY_WORD_LIMIT = 10;

// ─── Хелпер: чи та сама UTC-дата ─────────────────────────────────────────────

const isSameUTCDay = (a: Date, b: Date): boolean =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

// ─── Видача слова ─────────────────────────────────────────────────────────────

export const handleWords = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery().catch(() => { });
  }

  try {
    const user = await User.findOne({ telegramId });

    if (!user || !user.level) {
      return ctx.reply('Будь ласка, спочатку обери свій рівень за допомогою команди /start');
    }

    const now = new Date();

    const lastLearnDate = user.lastWordLearnDate;
    const isNewDay = !lastLearnDate || !isSameUTCDay(lastLearnDate, now);

    let wordsLearnedToday = user.wordsLearnedToday ?? 0;
    let carriedOverWords = user.carriedOverWords ?? 0;

    if (isNewDay) {
      const unused = DAILY_WORD_LIMIT - wordsLearnedToday;
      carriedOverWords = Math.min(Math.max(unused, 0), 0);
      wordsLearnedToday = 0;

      await User.findByIdAndUpdate(user._id, {
        $set: {
          wordsLearnedToday: 0,
          carriedOverWords,
        },
      });
    }

    const effectiveLimit = DAILY_WORD_LIMIT + carriedOverWords;

    if (!user.isPremium && wordsLearnedToday >= effectiveLimit) {
      const limitMsg =
        `⏰ *Слова на сьогодні закінчились!*\n\n` +
        `Ти опрацював ${wordsLearnedToday} слів — відмінно! 🎉\n` +
        `Нові слова будуть доступні завтра.\n\n` +
        `💎 _Або підключи Premium для безлімітного навчання._`;

      const limitKeyboard = new InlineKeyboard()
        .text('🔔 Нагадати завтра', 'reminder_tomorrow')
        .row()
        .text('💎 Отримати Premium', 'buy_premium');

      if (ctx.callbackQuery) {
        return ctx.editMessageText(limitMsg, {
          parse_mode: 'Markdown',
          reply_markup: limitKeyboard,
        }).catch(() =>
          ctx.reply(limitMsg, { parse_mode: 'Markdown', reply_markup: limitKeyboard }),
        );
      }
      return ctx.reply(limitMsg, { parse_mode: 'Markdown', reply_markup: limitKeyboard });
    }

    if (user.lastAudioMessageId && ctx.chat?.id) {
      await ctx.api.deleteMessage(ctx.chat.id, user.lastAudioMessageId).catch(() => { });
      await User.findByIdAndUpdate(user._id, { $set: { lastAudioMessageId: null } });
    }

    const words = await getRandomWords(user, 1);

    if (!words || words.length === 0) {
      return ctx.reply('На жаль, для твого рівня поки немає слів у базі 😔');
    }
    if (user.wordsLearnedToday >= 5) {
      await checkAndRewardReferrer(ctx, user.telegramId);
    }

    const word = words[0];

    const message =
      `📚 *Твоє слово на сьогодні (${user.level})*\n\n` +
      `🇺🇦 ${word.ukrainian}\n` +
      `🇬🇧 ${word.english}\n` +
      `🔊 ${word.transcription}`;

    const keyboard = new InlineKeyboard()
      .text('🔊 Слухати вимову', `audio_${word.english}`)
      .text('💾 Зберегти', `save_word_${word._id}`)
      .row()
      .text('➡️ Наступне слово', 'next_word');

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }).catch(async (error: any) => {
        if (error?.description?.includes('message is not modified')) {
          await ctx.answerCallbackQuery('Випало те ж саме слово! Тисни ще раз 😅').catch(() => { });
        }
      });
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    await updateUserProgress(telegramId, 'word', word._id.toString());
    await User.findByIdAndUpdate(user._id, {
      $set: {
        lastWordLearnDate: now,
      },
    });

  } catch (error: any) {
    console.error('Помилка при видачі слів:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.').catch(() => { });
  }
};

export const handleReminderTomorrow = async (ctx: Context) => {
  await ctx.answerCallbackQuery().catch(() => { });

  const keyboard = new InlineKeyboard()
    .text('08:00', 'set_reminder_08:00')
    .text('10:00', 'set_reminder_10:00')
    .text('12:00', 'set_reminder_12:00')
    .row()
    .text('18:00', 'set_reminder_18:00')
    .text('20:00', 'set_reminder_20:00')
    .text('22:00', 'set_reminder_22:00');

  await ctx.reply(
    '🕐 *О котрій нагадати?*\nОберіть зручний час (UTC):',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  );
};

export const handleSetReminder = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery().catch(() => { });

  const time = ctx.callbackQuery?.data?.replace('set_reminder_', '') ?? '10:00';

  await User.findOneAndUpdate({ telegramId }, { $set: { reminderTime: time } });

  await ctx.reply(
    `✅ Нагадування встановлено на *${time}* (UTC) завтра! 🔔`,
    { parse_mode: 'Markdown' },
  );
};

export const handleWordAudio = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !telegramId) return;

  await ctx.answerCallbackQuery().catch(() => { });

  const wordToPronounce = callbackData.substring('audio_'.length);

  try {
    const user = await User.findOne({ telegramId });

    if (user?.lastAudioMessageId && ctx.chat?.id) {
      await ctx.api.deleteMessage(ctx.chat.id, user.lastAudioMessageId).catch(() => { });
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
  }
};