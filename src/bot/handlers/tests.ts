import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRandomTest, getTestForLearnedWords, resetAndGetLearnedTest } from '../../services/testService';
import { getAudioUrl } from '../../services/audioService';
import { updateUserProgress } from '../../services/progressService';

const escapeMarkdownV2 = (text: string): string =>
  text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');

// ─── Хелпер: inline-клавіатура варіантів відповіді ───────────────────────────
type TestSource = 'general' | 'learned' | 'repeat';

const buildTestKeyboard = (
  testId: string,
  options: string[],
  correctIndex: number,
  source: TestSource,
): InlineKeyboard => {
  const keyboard = new InlineKeyboard();
  options.forEach((option, index) => {
    const isCorrect = index === correctIndex ? '1' : '0';
    keyboard.text(option, `answer_${testId}_${isCorrect}_${source}`).row();
  });
  return keyboard;
};

const sendTestMessage = async (
  ctx: Context,
  testData: any,
  source: TestSource,
) => {
  const questionText = testData.question.replace(/___/g, '…');
  const safeQuestion = escapeMarkdownV2(questionText);
  
  // 1. Різні заголовки залежно від типу тесту
  const title = source === 'general' ? '🎯 *Міні\\-тест*' : '🧪 *Тест до слова*';
  const message = `${title}\n\n${safeQuestion}`;

  const keyboard = buildTestKeyboard(
    testData._id.toString(),
    testData.options,
    testData.correctOptionIndex,
    source,
  );

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(message, { reply_markup: keyboard, parse_mode: 'MarkdownV2' })
      .catch((err: any) => {
        if (!err?.description?.includes('message is not modified')) {
          console.error('editMessageText error:', err);
        }
      });
  } else {
    await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'MarkdownV2' });
  }
};

// ─── Екран "Всі тести пройдено" ──────────────────────────────────────────────
const sendAllDoneMessage = async (ctx: Context) => {
  const text =
    '✅ *Ти вже пройшов усі тести до вивчених слів\\!*\n\n' +
    'Можеш повторити їх ще раз для закріплення — ' +
    'або вивчи нові слова щоб отримати нові тести\\. 💪';

  const keyboard = new InlineKeyboard()
    .text('🔁 Повторити знову', 'learned_test_repeat')
    .row()
    .text('🎯 Загальні міні-тести', 'next_test');

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { parse_mode: 'MarkdownV2', reply_markup: keyboard })
      .catch(() =>
        ctx.reply(text, { parse_mode: 'MarkdownV2', reply_markup: keyboard }),
      );
  } else {
    await ctx.reply(text, { parse_mode: 'MarkdownV2', reply_markup: keyboard });
  }
};

// ─── Загальні міні-тести (🎯 Міні-тести) ─────────────────────────────────────
export const sendRandomTest = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

  try {
    const user = await User.findOne({ telegramId });
    if (!user || !user.level) {
      return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
    }

    const testData = await getRandomTest(user);
    if (!testData) {
      return ctx.reply('На жаль, для твого рівня поки немає тестів 😔');
    }

    await sendTestMessage(ctx, testData, 'general');
  } catch (error: any) {
    console.error('Помилка при видачі тесту:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.').catch(() => {});
  }
};

// ─── Тести до вивчених слів (🧪 Тести до слів) ───────────────────────────────
export const sendLearnedWordsTest = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

  try {
    const user = await User.findOne({ telegramId });
    if (!user || !user.level) {
      return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
    }

    if (!user.seenWords || user.seenWords.length === 0) {
      return ctx.reply(
        '📭 *Ти ще не вивчив жодного слова\\!*\n\n' +
        'Спочатку вивчи кілька слів через «📚 Нові слова», щоб тут з\'явились тести саме для них\\.',
        { parse_mode: 'MarkdownV2' },
      );
    }

    const result = await getTestForLearnedWords(user);

    if (!result) {
      return ctx.reply(
        '😔 *Тестів для твоїх вивчених слів ще немає\\.*\n\n' +
        'Адміністратор ще не додав тести для слів які ти вчив\\. ' +
        'Спробуй «🎯 Міні\\-тести» — там є загальні тести для твого рівня\\.',
        { parse_mode: 'MarkdownV2' },
      );
    }

    if (result.isRepeat) {
      return sendAllDoneMessage(ctx);
    }

    await sendTestMessage(ctx, result.test, 'learned');
  } catch (error: any) {
    console.error('Помилка при видачі тесту до слів:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй пізніше.').catch(() => {});
  }
};

// ─── Повторення тестів до слів (після того як всі пройдено) ──────────────────
export const handleLearnedTestRepeat = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery().catch(() => {});

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return;

    const testData = await resetAndGetLearnedTest(user);

    if (!testData) {
      return ctx.reply('Нічого не знайдено. Спробуй вивчити більше слів!');
    }

    await sendTestMessage(ctx, testData, 'repeat');
  } catch (error: any) {
    console.error('Помилка при повторенні тестів:', error);
    await ctx.reply('Вибач, сталася помилка.').catch(() => {});
  }
};

// ─── Обробка відповіді ────────────────────────────────────────────────────────
// ─── Обробка відповіді ────────────────────────────────────────────────────────
export const handleTestAnswer = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !telegramId) return;

  const parts = callbackData.split('_');
  const source = parts[parts.length - 1] as TestSource;
  const isCorrect = parts[parts.length - 2] === '1';

  let alertText = isCorrect ? '✅ Правильно! +5 XP 🎯' : '❌ Неправильно. Спробуй ще раз!';
  let showAlert = false; // За замовчуванням повідомлення просто швидко зникає зверху

  // Якщо правильно — спочатку зберігаємо прогрес, щоб дізнатися новий XP
  if (isCorrect) {
    const progress = await updateUserProgress(telegramId, 'test');
    const totalXp = progress?.totalXp || 0;
    
    // Визначаємо ранг до і після правильної відповіді (ми додали 5 XP)
    const oldRank = Math.floor((totalXp - 5) / 1000) + 1;
    const newRank = Math.floor(totalXp / 1000) + 1;

    // Якщо ранг виріс — змінюємо текст і робимо велике спливаюче вікно
    if (newRank > oldRank) {
      alertText = `🎉 ВАУ! ТИ ОТРИМАВ ${newRank} РАНГ! 🏆\nПродовжуй у тому ж дусі!`;
      showAlert = true; 
    }
  }

  // Виводимо повідомлення користувачу
  await ctx.answerCallbackQuery({
    text: alertText,
    show_alert: showAlert,
  }).catch(() => {});

  if (!isCorrect) return;

  if (source === 'general') {
    const user = await User.findOne({ telegramId });
    if (user?.isPremium) {
      const wordToPronounce = ctx.callbackQuery?.message?.reply_markup?.inline_keyboard
        .flat()
        .find((btn) => 'callback_data' in btn && btn.callback_data === callbackData)?.text;

      if (wordToPronounce) {
        await ctx
          .replyWithVoice(getAudioUrl(wordToPronounce), { caption: `🔊 Вимова: ${wordToPronounce}` })
          .catch((err) => console.error('Помилка аудіо для тесту:', err));
      }
    }
  }

  // Автоматичний перехід до наступного питання
  if (source === 'general') {
    await sendRandomTest(ctx);
  } else if (source === 'learned') {
    await sendLearnedWordsTest(ctx);
  } else if (source === 'repeat') {
    await handleNextRepeatTest(ctx);
  }
};

// ─── Наступне питання в режимі повторення ────────────────────────────────────
export const handleNextRepeatTest = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery().catch(() => {});

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return;

    const result = await getTestForLearnedWords(user);

    if (!result) {
      return ctx.reply('Тестів більше немає. Вивчи нові слова!');
    }

    if (result.isRepeat) {
      return sendAllDoneMessage(ctx);
    }

    await sendTestMessage(ctx, result.test, 'repeat');
  } catch (error: any) {
    console.error('Помилка next_repeat_test:', error);
  }
};