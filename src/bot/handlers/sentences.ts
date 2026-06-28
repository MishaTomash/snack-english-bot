import { Context, InlineKeyboard } from 'grammy';
import mongoose from 'mongoose';
import { User } from '../../models/User';
import { getRandomSentence, shuffleWords } from '../../services/sentenceService';
import { updateUserProgress } from '../../services/progressService';

// ─── Стан сесії юзера під час вправи ─────────────────────────────────────────
// Зберігаємо в пам'яті: { telegramId -> стан }

interface SentenceSession {
  exerciseId: string;       // ID речення з БД
  correctWords: string[];   // ["I", "am", "working"] — правильний порядок
  shuffledWords: string[];  // ["working", "I", "am"] — перемішані кнопки
  chosen: number[];         // індекси вже натиснутих слів у shuffledWords
}

export const sentenceSessions = new Map<number, SentenceSession>();

// ─── Хелпер: будує клавіатуру для вправи ─────────────────────────────────────

const buildSentenceKeyboard = (session: SentenceSession): InlineKeyboard => {
  const kb = new InlineKeyboard();

  // Рядок 1 — зібране речення (обрані слова або плейсхолдер)
  if (session.chosen.length > 0) {
    const builtSentence = session.chosen
      .map(i => session.shuffledWords[i])
      .join(' ');

    kb.text(`📝 ${builtSentence}`, 'sentence_noop').row();
  } else {
    kb.text('📝 Натискай слова нижче...', 'sentence_noop').row();
  }

  // Рядок 2+ — кнопки зі словами (перемішані)
  // Вже натиснуті слова показуємо сірим (✓ слово)
  const wordButtons = session.shuffledWords.map((word, idx) => {
    const isChosen = session.chosen.includes(idx);
    return isChosen
      ? { label: `✓ ${word}`, data: `sentence_noop` }
      : { label: word, data: `sentence_word_${idx}` };
  });

  // Розкладаємо по 3 кнопки в рядок
  for (let i = 0; i < wordButtons.length; i++) {
    kb.text(wordButtons[i].label, wordButtons[i].data);
    if ((i + 1) % 3 === 0 || i === wordButtons.length - 1) kb.row();
  }

  // Кнопки управління
  kb.text('🔄 Скинути', 'sentence_reset').text('⏭ Пропустити', 'sentence_skip');

  return kb;
};

// ─── Відправляє нову вправу юзеру ─────────────────────────────────────────────

export const handleSentenceExercise = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return ctx.reply('Будь ласка, спочатку запустіть /start');

    const exercise = await getRandomSentence(user.seenTexts, user.level);

    if (!exercise) {
      return ctx.reply('😔 Речень поки немає. Адмін скоро додасть!');
    }

    // Розбиваємо речення на слова і перемішуємо
    const correctWords = exercise.sentence.trim().split(/\s+/);
    const shuffledWords = shuffleWords(correctWords);

    // Зберігаємо сесію
    sentenceSessions.set(telegramId, {
      exerciseId: exercise._id.toString(),
      correctWords,
      shuffledWords,
      chosen: [],
    });

    const keyboard = buildSentenceKeyboard(sentenceSessions.get(telegramId)!);

    const text =
      `✍️ <b>Склади речення</b>\n\n` +
      `🇺🇦 <b>Переклад:</b> ${exercise.translation}\n` +
      (exercise.explanation ? `💡 <i>${exercise.explanation}</i>\n` : '') +
      `\nНатискай слова у правильному порядку:`;

    if (ctx.callbackQuery?.message) {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      }).catch(async () => {
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
      });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (error) {
    console.error('Помилка при відправці вправи:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.').catch(() => {});
  }
};

// ─── Обробник натискання на слово ─────────────────────────────────────────────

export const handleSentenceWordTap = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery().catch(() => {});

  const session = sentenceSessions.get(telegramId);
  if (!session) {
    // Сесія протухла (рестарт бота) — запускаємо заново
    return handleSentenceExercise(ctx);
  }

  // Отримуємо індекс слова з callback data: sentence_word_2
  const raw = ctx.callbackQuery?.data ?? '';
  const wordIdx = parseInt(raw.replace('sentence_word_', ''), 10);

  if (isNaN(wordIdx) || wordIdx < 0 || wordIdx >= session.shuffledWords.length) return;
  if (session.chosen.includes(wordIdx)) return; // вже натиснуто

  // Додаємо слово до обраних
  session.chosen.push(wordIdx);

  // Якщо вибрані всі слова — перевіряємо
  if (session.chosen.length === session.shuffledWords.length) {
    await checkSentenceAnswer(ctx, telegramId, session);
    return;
  }

  // Оновлюємо клавіатуру
  const keyboard = buildSentenceKeyboard(session);

  await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
};

// ─── Перевірка відповіді ──────────────────────────────────────────────────────

const checkSentenceAnswer = async (
  ctx: Context,
  telegramId: number,
  session: SentenceSession
) => {
  const builtSentence = session.chosen
    .map(i => session.shuffledWords[i])
    .join(' ');

  const isCorrect =
    builtSentence.toLowerCase() === session.correctWords.join(' ').toLowerCase();

  // Очищаємо сесію
  sentenceSessions.delete(telegramId);

  if (isCorrect) {
    // Нараховуємо XP
    const { totalGained } = await updateUserProgress(telegramId, 'sentence');

    // Додаємо в seenTexts щоб не повторювалося одразу
    await User.findOneAndUpdate(
      { telegramId },
      { $addToSet: { seenTexts: new mongoose.Types.ObjectId(session.exerciseId) } }
    );

    const successKeyboard = new InlineKeyboard()
      .text('➡️ Наступне речення', 'sentence_next');

    await ctx.editMessageText(
      `✅ <b>Правильно!</b> Молодець! 🎉\n\n` +
      `📝 <b>${builtSentence}</b>\n\n` +
      `⭐ +${totalGained} XP`,
      { parse_mode: 'HTML', reply_markup: successKeyboard }
    ).catch(() => {
      ctx.reply(
        `✅ <b>Правильно!</b> +${totalGained} XP 🎉`,
        { parse_mode: 'HTML', reply_markup: successKeyboard }
      );
    });

  } else {
    const retryKeyboard = new InlineKeyboard()
      .text('🔄 Спробувати ще', 'sentence_retry')
      .text('⏭ Наступне', 'sentence_next');

    await ctx.editMessageText(
      `❌ <b>Не правильно</b>\n\n` +
      `Твій варіант: <i>${builtSentence}</i>\n` +
      `Правильно: <b>${session.correctWords.join(' ')}</b>`,
      { parse_mode: 'HTML', reply_markup: retryKeyboard }
    ).catch(() => {
      ctx.reply(
        `❌ Не правильно. Правильно: <b>${session.correctWords.join(' ')}</b>`,
        { parse_mode: 'HTML', reply_markup: retryKeyboard }
      );
    });
  }
};

// ─── Скидання поточного вибору (залишаємося на тому ж реченні) ───────────────

export const handleSentenceReset = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery().catch(() => {});

  const session = sentenceSessions.get(telegramId);
  if (!session) return handleSentenceExercise(ctx);

  // Просто обнуляємо обрані слова
  session.chosen = [];

  const keyboard = buildSentenceKeyboard(session);
  await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
};

// ─── Повторна спроба того ж речення ──────────────────────────────────────────

export const handleSentenceRetry = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery().catch(() => {});

  // Нова вправа того ж речення не потрібна — просто відправляємо нову
  return handleSentenceExercise(ctx);
};