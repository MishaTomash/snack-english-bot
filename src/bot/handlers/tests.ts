import { Context, InlineKeyboard, NextFunction } from 'grammy';
import { User } from '../../models/User';
import { getRandomTest, getTestForLearnedWords, resetAndGetLearnedTest } from '../../services/testService';
import { updateUserProgress } from '../../services/progressService';
import { TestQuestion } from '../../models/TestQuestion';

// escapeMarkdownV2 більше не потрібна — видалено

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

export const sendTestMessage = async (
  ctx: Context,
  testData: any,
  source: TestSource,
) => {
  const questionText = testData.question.replace(/___/g, '…');

  const title = source === 'general'
    ? '😏 <b>Не підглядай!</b>'
    : '🤔 <b>Ну що, памʼятаєш?</b>';

  const message = `${title}\n\n${questionText}`;

  const keyboard = buildTestKeyboard(
    testData._id.toString(),
    testData.options,
    testData.correctOptionIndex,
    source,
  );

  if (testData.explanation) {
    keyboard.row().text('💡 Пояснення', `explain_test_${testData._id}_${source}`);
  }

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(message, { reply_markup: keyboard, parse_mode: 'HTML' })
      .catch((err: any) => {
        if (!err?.description?.includes('message is not modified')) {
          console.error('editMessageText error:', err);
        }
      });
  } else {
    await ctx.reply(message, { reply_markup: keyboard, parse_mode: 'HTML' });
  }
};

// ─── Екран "Всі тести пройдено" ──────────────────────────────────────────────
const sendAllDoneMessage = async (ctx: Context) => {
  const text =
    '✅ <b>Ти вже пройшов усі тести до вивчених слів!</b>\n\n' +
    'Можеш повторити їх ще раз для закріплення — ' +
    'або вивчи нові слова щоб отримати нові тести. 💪';

  const keyboard = new InlineKeyboard()
    .text('🔁 Повторити знову', 'learned_test_repeat')
    .row()
    .text('🎯 Загальні міні-тести', 'next_test');

  if (ctx.callbackQuery) {
    await ctx
      .editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard })
      .catch(() => ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard }));
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};

// ─── Загальні міні-тести ──────────────────────────────────────────────────────
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

    await User.updateOne(
      { _id: user._id },
      {
        $inc: { testsTakenToday: 1 },
        $set: { lastTestDate: new Date() },
      }
    );
  } catch (error: any) {
    console.error('Помилка при видачі тесту:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.').catch(() => {});
  }
};

// ─── Тести до вивчених слів ───────────────────────────────────────────────────
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
        '📭 <b>Ти ще не вивчив жодного слова!</b>\n\n' +
        'Спочатку вивчи кілька слів через «📚 Вчити слова», щоб тут з\'явились тести саме для них.',
        { parse_mode: 'HTML' },
      );
    }

    const result = await getTestForLearnedWords(user);

    if (!result) {
      return ctx.reply(
        '😔 <b>Тестів для твоїх вивчених слів ще немає.</b>\n\n' +
        'Адміністратор ще не додав тести для слів які ти вчив. ' +
        'Спробуй «🎯 Міні-тести» — там є загальні тести для твого рівня.',
        { parse_mode: 'HTML' },
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

// ─── Повторення тестів до слів ────────────────────────────────────────────────
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
export const handleTestAnswer = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !telegramId) return;

  const parts = callbackData.split('_');
  const source = parts[parts.length - 1] as TestSource;
  const isCorrect = parts[parts.length - 2] === '1';

  let alertText = isCorrect ? '✅ Правильно! +5 XP 🎯' : '❌ Неправильно. Спробуй ще раз!';
  let showAlert = false;

  if (isCorrect) {
    const progress = await updateUserProgress(telegramId, 'test');
    const totalXp = progress?.totalXp || 0;

    const oldRank = Math.floor((totalXp - 5) / 1000) + 1;
    const newRank = Math.floor(totalXp / 1000) + 1;

    if (newRank > oldRank) {
      alertText = `🎉 ВАУ! ТИ ОТРИМАВ ${newRank} РАНГ! 🏆\nПродовжуй у тому ж дусі!`;
      showAlert = true;
    }
  }

  await ctx.answerCallbackQuery({ text: alertText, show_alert: showAlert }).catch(() => {});

  if (!isCorrect) return;

  if (source === 'general') {
    const user = await User.findOne({ telegramId });
    const FREE_TESTS_LIMIT = 10;
    const isLimitReached = user && !user.isPremium && (user.testsTakenToday >= FREE_TESTS_LIMIT);

    if (isLimitReached) {
      const limitMsg =
        `🛑 <b>Ліміт на сьогодні — край!</b>\n\n` +
        `Ти пройшов <b>${FREE_TESTS_LIMIT}</b> тестів безкоштовно. Це більше, ніж домашок за тиждень. 🎉\n\n` +
        `💎 <b>Premium</b> знімає ліміт — тестуй до ночі, бот не засне.`;

      return await ctx.reply(limitMsg, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('💎 Отримати Premium', 'open_premium_menu'),
      }).catch(() => {});
    }
  }

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

// ─── Пояснення ────────────────────────────────────────────────────────────────
export const handleExplainTest = async (ctx: Context) => {
  if (!ctx.match || !ctx.match[1]) return;

  const matchData = (ctx.match[1] as string).split('_');
  const testId = matchData[0];
  const source = matchData[1] || 'general';

  try {
    const test = await TestQuestion.findById(testId);
    if (!test || !test.explanation) {
      return ctx.answerCallbackQuery({ text: 'На жаль, пояснення не знайдено 😔', show_alert: true });
    }

    const backKeyboard = new InlineKeyboard()
      .text('🔙 Назад до тесту', `back_to_test_${testId}_${source}`);

    await ctx.editMessageText(
      `💡 <b>Підглядаєш? Ну-ну 😏</b>\n\n${test.explanation}`,
      { parse_mode: 'HTML', reply_markup: backKeyboard }
    ).catch(() => {});
  } catch (err) {
    console.error('Помилка показу пояснення:', err);
  }
};

// ─── Назад до тесту ───────────────────────────────────────────────────────────
export const handleBackToTest = async (ctx: Context) => {
  if (!ctx.match || !ctx.match[1]) return;

  const matchData = (ctx.match[1] as string).split('_');
  const testId = matchData[0];
  const source = matchData[1] as any || 'general';

  try {
    const testData = await TestQuestion.findById(testId);
    if (!testData) {
      return ctx.answerCallbackQuery({ text: 'Тест не знайдено', show_alert: true });
    }

    await sendTestMessage(ctx, testData, source);
  } catch (err) {
    console.error('Помилка повернення до тесту:', err);
  }
};

// ─── Ліміт тестів ─────────────────────────────────────────────────────────────
export const checkTestLimits = async (ctx: Context, next: NextFunction) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return await next();

  const user = await User.findOne({ telegramId });
  if (!user) return await next();

  if (user.isPremium) return await next();

  const FREE_TESTS_LIMIT = 10;
  const now = new Date();
  const lastTest = user.lastTestDate || new Date(0);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastTestDay = new Date(lastTest.getFullYear(), lastTest.getMonth(), lastTest.getDate());

  if (today.getTime() > lastTestDay.getTime()) {
    user.testsTakenToday = 0;
    await user.save();
  }

  if (user.testsTakenToday >= FREE_TESTS_LIMIT) {
    const message =
      `🛑 Ти вичерпав свій денний ліміт безкоштовних тестів (<b>${FREE_TESTS_LIMIT} тестів</b>).\n\n` +
      `💎 Оформи Premium, щоб проходити необмежену кількість тестів та швидше покращувати свою англійську!`;

    const keyboard = new InlineKeyboard().text('💎 Отримати Premium', 'open_premium_menu');

    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: 'Денний ліміт тестів вичерпано 🛑', show_alert: true }).catch(() => {});
      return await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
    }

    return await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
  }

  await next();
};