import { Context, InlineKeyboard } from 'grammy';
import { Course, ICourse } from '../../models/Course';
import { CourseProgress } from '../../models/CourseProgress';
import { User } from '../../models/User';

// ─── Хелпери ─────────────────────────────────────────────────────────────────

const e = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Прогрес-шкала: ████████░░ 80%
const progressBar = (current: number, total: number): string => {
  if (total === 0) return '░░░░░░░░░░ 0%';
  const filled = Math.round((current / total) * 10);
  const pct = Math.round((current / total) * 100);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${pct}%`;
};

// ─── 1. Список курсів ─────────────────────────────────────────────────────────

export const handleCoursesList = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

  const user = await User.findOne({ telegramId }).lean();
  if (!user) return;

  // Виводимо курси за датою створення. Найстаріший (індекс 0) буде безкоштовним!
  const courses = await Course.find({ isPublished: true }).sort({ createdAt: 1 }).lean();

  if (courses.length === 0) {
    const msg = 'На жаль, курси поки що не додані 😔';
    if (ctx.callbackQuery) await ctx.editMessageText(msg).catch(() => ctx.reply(msg));
    else await ctx.reply(msg);
    return;
  }

  const progresses = await CourseProgress.find({ telegramId }).lean();

  let text = `📚 <b>МОЇ КУРСИ</b>\n\n`;
  const keyboard = new InlineKeyboard();

  courses.forEach((course, index) => {
    // Головна логіка: 0 індекс = перший курс (безкоштовно), інакше потрібен Premium
    const isFirstCourse = index === 0;
    const hasAccess = isFirstCourse || user.isPremium;
    
    const prog = progresses.find((p) => p.courseSlug === course.slug);
    const currentLesson = prog?.currentLesson ?? 0;
    const started = !!prog;
    const totalLessons = course.lessons.length;

    const icon = hasAccess ? '✅' : '🔒';
    const accessLabel = isFirstCourse ? 'Безкоштовно' : 'Premium 💎';

    text += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    text += `┃ ${icon} <b>${e(course.title)}</b>\n`;
    text += `┃ ──────────────────────────\n`;
    text += `┃ 💳 Доступ: <b>${accessLabel}</b>\n`;

    if (hasAccess && totalLessons > 0) {
      const bar = progressBar(currentLesson, totalLessons);
      text += `┃ 📊 Прогрес: ${bar}\n`;
      text += `┃ 📖 Урок ${currentLesson}/${totalLessons}\n`;
    }

    text += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

    if (hasAccess) {
      const btnLabel = started && currentLesson > 0
        ? `▶ Продовжити: ${course.title}`
        : `📖 Відкрити: ${course.title}`;
      keyboard.text(btnLabel, `course_open_${course.slug}`).row();
    } else {
      // Якщо немає доступу, направляємо на покупку Premium
      keyboard.text(`💎 Отримати Premium для доступу`, `buy_premium`).row();
    }
  });

  const opts = { parse_mode: 'HTML' as const, reply_markup: keyboard };
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
  } else {
    await ctx.reply(text, opts);
  }
};

// ─── 2. Відкрити курс (список уроків) ────────────────────────────────────────

export const handleCourseOpen = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await ctx.answerCallbackQuery().catch(() => {});

  const slug = ctx.callbackQuery?.data?.replace('course_open_', '') ?? '';
  const course = await Course.findOne({ slug, isPublished: true }).lean();
  if (!course) return;

  const allCourses = await Course.find({ isPublished: true }).sort({ createdAt: 1 }).lean();
  const courseIndex = allCourses.findIndex(c => c.slug === slug);
  const isFirstCourse = courseIndex === 0;

  const user = await User.findOne({ telegramId });
  const hasAccess = isFirstCourse || user?.isPremium;

  if (!hasAccess) {
    await ctx.answerCallbackQuery({ text: '🔒 Цей курс доступний тільки з Premium!', show_alert: true }).catch(() => {});
    return;
  }

  let progress = await CourseProgress.findOne({ telegramId, courseSlug: slug });
  if (!progress) {
    progress = await CourseProgress.create({ telegramId, courseSlug: slug, currentLesson: 0 });
  }

  const currentLesson = progress.currentLesson ?? 0;
  const totalLessons = course.lessons.length;
  const bar = progressBar(currentLesson, totalLessons);

  let text = `📘 <b>КУРС: ${e(course.title)}</b>\n`;
  text += `📊 Прогрес: ${bar} (${currentLesson}/${totalLessons})\n\n`;

  const keyboard = new InlineKeyboard();

  course.lessons.forEach((lesson, idx) => {
    const isDone = idx < currentLesson;
    const isCurrent = idx === currentLesson;
    const icon = isDone ? '✅' : isCurrent ? '📖' : '🔒';

    text += `${icon} ${e(lesson.title)}\n`;

    if (isDone || isCurrent) {
      keyboard.text(`${icon} ${lesson.title}`, `lesson_theory_${slug}_${idx}`).row();
    }
  });

  keyboard.text('← Назад до курсів', 'courses_list');

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  }).catch(() => {});
};

// ─── 3. Теорія уроку ─────────────────────────────────────────────────────────

export const handleLessonTheory = async (ctx: Context) => {
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('lesson_theory_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;

  const lesson = course.lessons[lessonIdx];
  const totalLessons = course.lessons.length;

  let text = `📖 <b>${e(lesson.title)}</b>\n`;
  text += `<i>Урок ${lessonIdx + 1} з ${totalLessons}</i>\n\n`;
  text += e(lesson.theory);

  const keyboard = new InlineKeyboard()
    .text('📌 Приклади', `lesson_examples_${slug}_${lessonIdx}`)
    .text('📝 Тест', `lesson_test_${slug}_${lessonIdx}`)
    .row()
    .text('← До курсу', `course_open_${slug}`);

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  }).catch(() => {});
};

// ─── 4. Приклади уроку ───────────────────────────────────────────────────────

export const handleLessonExamples = async (ctx: Context) => {
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('lesson_examples_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;

  const lesson = course.lessons[lessonIdx];

  let text = `📌 <b>Приклади до теорії «${e(lesson.title)}»</b>\n\n`;
  if (lesson.examples.length === 0) {
    text += '<i>Приклади ще не додані</i>';
  } else {
    lesson.examples.forEach((ex) => { text += `✅ ${e(ex)}\n`; });
  }

  const keyboard = new InlineKeyboard()
    .text('🔙 Назад до теорії', `lesson_theory_${slug}_${lessonIdx}`);

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  }).catch(() => {});
};

// ─── 5. Тест уроку ───────────────────────────────────────────────────────────

export const handleLessonTest = async (ctx: Context) => {
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('lesson_test_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;

  const lesson = course.lessons[lessonIdx];

  if (lesson.tests.length === 0) {
    await ctx.editMessageText('📝 Тест для цього уроку ще не додано.', {
      reply_markup: new InlineKeyboard().text('← До курсу', `course_open_${slug}`),
    }).catch(() => {});
    return;
  }

  await showTestQuestion(ctx, slug, lessonIdx, 0, []);
};

// Показ одного питання
export const showTestQuestion = async (
  ctx: Context,
  slug: string,
  lessonIdx: number,
  questionIdx: number,
  answers: number[],
) => {
  const course = await Course.findOne({ slug }).lean();
  if (!course) return;

  const lesson = course.lessons[lessonIdx];
  const test = lesson.tests[questionIdx];
  const total = lesson.tests.length;

  let text = `📝 <b>Тест: ${e(lesson.title)}</b>\n`;
  text += `Питання ${questionIdx + 1} з ${total}\n\n`;
  text += `<b>${questionIdx + 1}️⃣ ${e(test.question)}</b>\n`;

  const keyboard = new InlineKeyboard();
  const answersEncoded = answers.join(',');

  test.options.forEach((opt, i) => {
    const label = String.fromCharCode(65 + i);
    keyboard
      .text(`${label}) ${opt}`, `course_answer_${slug}_${lessonIdx}_${questionIdx}_${i}_${answersEncoded}`)
      .row();
  });

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  }).catch(() => {});
};

// ─── 6. Відповідь на питання ─────────────────────────────────────────────────

export const handleCourseAnswer = async (ctx: Context) => {
  await ctx.answerCallbackQuery().catch(() => {});

  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('course_answer_', '');
  const parts = withoutPrefix.split('_');

  const prevAnswersRaw = parts[parts.length - 1];
  const answerIdx = parseInt(parts[parts.length - 2], 10);
  const questionIdx = parseInt(parts[parts.length - 3], 10);
  const lessonIdx = parseInt(parts[parts.length - 4], 10);
  const slug = parts.slice(0, -4).join('_');

  const prevAnswers = prevAnswersRaw ? prevAnswersRaw.split(',').map(Number) : [];
  const allAnswers = [...prevAnswers, answerIdx];

  const course = await Course.findOne({ slug }).lean();
  if (!course) return;

  const lesson = course.lessons[lessonIdx];
  const test = lesson.tests[questionIdx];
  const isCorrect = answerIdx === test.correctIndex;
  const nextQuestionIdx = questionIdx + 1;
  const isLastQuestion = nextQuestionIdx >= lesson.tests.length;

  const resultIcon = isCorrect ? '✅' : '❌';
  let resultText = `${resultIcon} <b>${isCorrect ? 'Правильно!' : 'Неправильно'}</b>\n\n`;
  resultText += `Питання: <i>${e(test.question)}</i>\n`;
  if (!isCorrect) {
    resultText += `Правильна відповідь: <b>${e(test.options[test.correctIndex])}</b>\n`;
  }
  if (test.explanation) resultText += `💡 ${e(test.explanation)}\n`;

  const keyboard = new InlineKeyboard();

  if (!isLastQuestion) {
    keyboard.text('➡️ Наступне питання', `course_nextq_${slug}_${lessonIdx}_${nextQuestionIdx}_${allAnswers.join(',')}`);
  } else {
    const correctCount = allAnswers.filter((ans, i) => ans === lesson.tests[i].correctIndex).length;
    const total = lesson.tests.length;
    resultText += `\n━━━━━━━━━━━━━━━━━━━\n🎯 <b>Результат: ${correctCount}/${total}</b>\n`;

    if (correctCount === total) {
      resultText += `🎉 Чудово! Переходь до наступного уроку!\n`;
      const nextLesson = lessonIdx + 1;
      const isCourseDone = nextLesson >= course.lessons.length;

      await CourseProgress.findOneAndUpdate(
        { telegramId, courseSlug: slug },
        { currentLesson: isCourseDone ? lessonIdx : nextLesson, completed: isCourseDone },
        { upsert: true },
      );

      if (isCourseDone) {
        keyboard.text('🎊 Завершити курс', `course_finish_${slug}`).row().text('← До курсів', 'courses_list');
      } else {
        keyboard.text('➡️ Наступний урок', `course_open_${slug}`).row().text('← До курсу', `course_open_${slug}`);
      }
    } else {
      resultText += `💪 Спробуй ще раз!\n`;
      keyboard.text('🔄 Повторити тест', `lesson_test_${slug}_${lessonIdx}`).row().text('← До курсу', `course_open_${slug}`);
    }
  }

  await ctx.editMessageText(resultText, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
};

// ─── 7. Наступне питання ─────────────────────────────────────────────────────

export const handleCourseNextQuestion = async (ctx: Context) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('course_nextq_', '');
  const parts = withoutPrefix.split('_');
  const answersRaw = parts[parts.length - 1];
  const questionIdx = parseInt(parts[parts.length - 2], 10);
  const lessonIdx = parseInt(parts[parts.length - 3], 10);
  const slug = parts.slice(0, -3).join('_');
  const answers = answersRaw ? answersRaw.split(',').map(Number) : [];
  await showTestQuestion(ctx, slug, lessonIdx, questionIdx, answers);
};

// ─── 8. Завершення курсу ─────────────────────────────────────────────────────

export const handleCourseFinish = async (ctx: Context) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const slug = ctx.callbackQuery?.data?.replace('course_finish_', '') ?? '';
  const course = await Course.findOne({ slug }).lean();
  if (!course) return;

  const text =
    `━━━━━━━━━━━━━━━━━━━\n🎉 <b>ВІТАЮ!</b>\n━━━━━━━━━━━━━━━━━━━\n\n` +
    `Ти повністю завершив курс «<b>${e(course.title)}</b>»!\n\n` +
    `📅 Щоб закріпити знання:\n🔁 Повторити через 1 день\n🔁 Повторити через 3 дні`;

  const keyboard = new InlineKeyboard()
    .text('🔔 Нагадати через 1 день', `course_remind_${slug}_1`).row()
    .text('🔔 Нагадати через 3 дні', `course_remind_${slug}_3`).row()
    .text('← До курсів', 'courses_list');

  await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
};

// ─── 9. Нагадування ──────────────────────────────────────────────────────────

export const handleCourseReminder = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const data = ctx.callbackQuery?.data ?? '';
  const parts = data.replace('course_remind_', '').split('_');
  const days = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + days);

  await CourseProgress.findOneAndUpdate({ telegramId, courseSlug: slug }, { reviewDate });

  await ctx.answerCallbackQuery({
    text: `✅ Нагадаємо через ${days} ${days === 1 ? 'день' : 'дні'}!`,
    show_alert: true,
  }).catch(() => {});

  await ctx.editMessageReplyMarkup({
    reply_markup: new InlineKeyboard().text('← До курсів', 'courses_list'),
  }).catch(() => {});
};