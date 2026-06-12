import { Context, InlineKeyboard } from 'grammy';
import { Course } from '../../models/Course';
import { CourseProgress } from '../../models/CourseProgress';
import { User } from '../../models/User';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HTML = { parse_mode: 'HTML' as const };
const NO_PREVIEW = { link_preview_options: { is_disabled: true } };

async function sendOrEdit(ctx: Context, text: string, extra: object = {}) {
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, extra).catch(() => {});
  } else {
    await ctx.reply(text, extra);
  }
}

// ─── 1. Список курсів ─────────────────────────────────────────────────────────

export const handleCoursesList = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;
  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

  const courses = await Course.find().lean();

  if (!courses.length) {
    return sendOrEdit(ctx, '😔 Курси ще не додані. Повертайтеся пізніше!');
  }

  const keyboard = new InlineKeyboard();
  courses.forEach(c => {
    const badge = c.isPremium ? ' 💎' : '';
    keyboard.text(`${c.emoji} ${c.title}${badge}`, `c_open_${c._id}`).row();
  });

  await sendOrEdit(ctx, '📚 <b>Доступні курси</b>\n\nОберіть тему, яку хочете вивчити 👇', {
    ...HTML,
    reply_markup: keyboard,
  });
};

// ─── 2. Відкриття курсу ───────────────────────────────────────────────────────

export const handleCourseOpen = async (ctx: Context, overrideCourseId?: string) => {
  const courseId = overrideCourseId ?? ctx.callbackQuery?.data?.replace('c_open_', '');
  const telegramId = ctx.from?.id;
  if (!courseId || !telegramId) return;

  const course = await Course.findById(courseId).lean();
  if (!course) return ctx.answerCallbackQuery('❌ Курс не знайдено').catch(() => {});

  // Premium guard
  if (course.isPremium) {
    const user = await User.findOne({ telegramId }).lean();
    if (!user?.isPremium) {
      return ctx.editMessageText(
        '🔒 <b>Курс доступний лише для Premium</b>\n\nОформіть підписку, щоб розблокувати всі курси.',
        {
          ...HTML,
          reply_markup: new InlineKeyboard()
            .text('💎 Отримати Premium', 'open_premium_menu').row()
            .text('🔙 Назад до курсів', 'courses_list'),
        }
      ).catch(() => {});
    }
  }

  // Ensure progress record exists
  let progress = await CourseProgress.findOne({ telegramId, courseId });
  if (!progress) {
    progress = await CourseProgress.create({ telegramId, courseId, viewedVideos: [], completedTests: [] });
  }

  const viewedSet = new Set(progress.viewedVideos.map(String));
  const completedSet = new Set((progress.completedTests ?? []).map(String));

  const totalVideos = course.videos.length;
  const viewedCount = course.videos.filter(v => viewedSet.has(v._id.toString())).length;

  // ── Build text ──
  let text = `📘 <b>${course.title}</b>\n`;
  text += `\n🎬 <b>Відео</b> (${viewedCount}/${totalVideos} переглянуто)\n`;
  if (!totalVideos) text += '  — Відео ще не додані\n';

  const keyboard = new InlineKeyboard();

  course.videos.forEach((v, idx) => {
    const isViewed = viewedSet.has(v._id.toString());
    text += `${isViewed ? '✅' : '▫️'} ${idx + 1}. ${v.title}\n`;

    // Always show URL so user can rewatch; mark button only if not yet viewed
    keyboard.url(`${isViewed ? '✅' : '▶️'} Відео ${idx + 1}: ${v.title}`, v.url);
    if (!isViewed) {
      keyboard.text('✅ Відмітити', `c_view_${course._id}_${v._id}`);
    }
    keyboard.row();
  });

  text += `\n📝 <b>Тести</b>\n`;
  if (!course.tests.length) text += '  — Тести ще не додані\n';

  course.tests.forEach(t => {
    const isDone = completedSet.has(t._id.toString());
    keyboard.text(
      isDone ? `✅ ${t.title}` : `📝 ${t.title}`,
      `ct_${course._id}_${t._id}_0`
    ).row();
  });

  keyboard.text('🔙 До списку курсів', 'courses_list');

  await ctx.editMessageText(text, {
    ...HTML,
    ...NO_PREVIEW,
    reply_markup: keyboard,
  }).catch(() => {});
};

// ─── 3. Відмітити відео як переглянуте ───────────────────────────────────────

export const handleMarkVideoViewed = async (ctx: Context) => {
  const data = ctx.callbackQuery?.data?.replace('c_view_', '');
  const telegramId = ctx.from?.id;
  if (!data || !telegramId) return;

  const [courseId, videoId] = data.split('_');

  await CourseProgress.findOneAndUpdate(
    { telegramId, courseId },
    { $addToSet: { viewedVideos: videoId } }
  );

  await ctx.answerCallbackQuery('✅ Відмічено як переглянуте!').catch(() => {});
  await handleCourseOpen(ctx, courseId);
};

// ─── 4. Питання тесту ─────────────────────────────────────────────────────────

export const handleCourseTestQuestion = async (ctx: Context) => {
  const data = ctx.callbackQuery?.data?.replace('ct_', '');
  if (!data) return;

  const [courseId, testId, qIdxStr] = data.split('_');
  const qIdx = parseInt(qIdxStr, 10);

  const course = await Course.findById(courseId).lean();
  if (!course) return;

  const telegramId = ctx.from?.id;
  const test = course.tests.find(t => t._id.toString() === testId);

  // Test finished or index out of bounds → mark completed
  if (!test || !test.questions[qIdx]) {
    if (telegramId && test) {
      await CourseProgress.findOneAndUpdate(
        { telegramId, courseId },
        { $addToSet: { completedTests: testId } }
      );
    }

    // Check if there are more tests to suggest
    const testIndex = course.tests.findIndex(t => t._id.toString() === testId);
    const nextTest = course.tests[testIndex + 1];

    const keyboard = new InlineKeyboard();
    if (nextTest) {
      keyboard.text(`▶️ Наступний тест: ${nextTest.title}`, `ct_${courseId}_${nextTest._id}_0`).row();
    }
    keyboard.text('🔙 Повернутися до курсу', `c_open_${courseId}`);

    return ctx.editMessageText(
      '🎉 <b>Тест завершено!</b>\n\nДякуємо за практику. Продовжуйте вивчати матеріал 💪',
      { ...HTML, reply_markup: keyboard }
    ).catch(() => {});
  }

  const question = test.questions[qIdx];
  const keyboard = new InlineKeyboard();

  question.options.forEach((opt, idx) => {
    keyboard.text(opt, `ca_${courseId}_${testId}_${qIdx}_${idx}`).row();
  });
  keyboard.text('⛔ Зупинити тест', `c_open_${courseId}`);

  const text =
    `📝 <b>${test.title}</b>\n` +
    `<i>Питання ${qIdx + 1} з ${test.questions.length}</i>\n\n` +
    `${question.question}`;

  await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard }).catch(() => {});
};

// ─── 5. Відповідь на питання тесту ───────────────────────────────────────────

export const handleCourseTestAnswer = async (ctx: Context) => {
  const data = ctx.callbackQuery?.data?.replace('ca_', '');
  if (!data) return;

  const [courseId, testId, qIdxStr, ansIdxStr] = data.split('_');
  const qIdx = parseInt(qIdxStr, 10);
  const ansIdx = parseInt(ansIdxStr, 10);

  const course = await Course.findById(courseId).lean();
  if (!course) return;

  const test = course.tests.find(t => t._id.toString() === testId);
  if (!test || !test.questions[qIdx]) return;

  const question = test.questions[qIdx];
  const isCorrect = question.correctIndex === ansIdx;
  const nextIdx = qIdx + 1;
  const isLast = nextIdx >= test.questions.length;

  let text =
    `📝 <b>${test.title}</b>\n` +
    `<i>Питання ${qIdx + 1} з ${test.questions.length}</i>\n\n` +
    `${question.question}\n\n`;

  text += isCorrect
    ? `✅ <b>Правильно!</b>`
    : `❌ <b>Неправильно.</b>\nПравильна відповідь: <b>${question.options[question.correctIndex]}</b>`;

  if (question.explanation) {
    text += `\n\n💡 <i>${question.explanation}</i>`;
  }

  const keyboard = new InlineKeyboard();

  keyboard.text(
    isLast ? '🏁 Завершити тест' : '➡️ Наступне питання',
    `ct_${courseId}_${testId}_${nextIdx}`
  ).row();

  keyboard.text('🔙 Назад до курсу', `c_open_${courseId}`);

  await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard }).catch(() => {});
};