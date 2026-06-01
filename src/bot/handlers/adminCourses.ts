import { Context, InlineKeyboard } from 'grammy';
import { config } from '../../config';
import { Course } from '../../models/Course';
import { CourseProgress } from '../../models/CourseProgress';
import { createMainMenu } from '../keyboards/main';
import { User } from '../../models/User';

const isAdmin = (ctx: Context) => ctx.from?.id === config.ADMIN_ID;
const e = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── Стан для багатокрокового введення ───────────────────────────────────────

interface AdminCourseState {
  step: string;
  slug?: string;
  lessonIdx?: number;
  testIdx?: number;     
  exampleIdx?: number;  
  addedCount?: number;  
}

export const adminCourseState = new Map<number, AdminCourseState>();

// ─── Список курсів ────────────────────────────────────────────────────────────

export const handleAdminCoursesList = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

  // Сортуємо курси за датою, щоб бачити, який з них перший
  const courses = await Course.find({}).sort({ createdAt: 1 }).lean();

  let text = `📚 <b>Управління курсами</b>\nВсього: <b>${courses.length}</b>\n\n`;
  const keyboard = new InlineKeyboard();

  courses.forEach((c, index) => {
    const status = c.isPublished ? '✅' : '📝';
    const accessType = index === 0 ? 'Безкоштовно' : 'Premium 💎';
    
    text += `${status} <b>${e(c.title)}</b> — ${accessType} | ${c.lessons.length} уроків\n`;
    text += `   <code>${c.slug}</code>\n\n`;

    keyboard
      .text(`✏️ ${c.title}`, `adm_course_edit_${c.slug}`)
      .text(c.isPublished ? '🙈 Скрити' : '🚀 Опубл.', `adm_course_toggle_${c.slug}`)
      .text('🗑', `adm_course_del_${c.slug}`)
      .row();
  });

  keyboard.text('➕ Новий курс', 'adm_course_new');

  const opts = { parse_mode: 'HTML' as const, reply_markup: keyboard };
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, opts).catch(() => ctx.reply(text, opts));
  } else {
    await ctx.reply(text, opts);
  }
};

// ─── Новий курс ───────────────────────────────────────────────────────────────

export const handleAdminCourseNew = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});
  adminCourseState.set(ctx.from!.id, { step: 'new_course' });

  await ctx.editMessageText(
    `➕ <b>Новий курс</b>\n\n` +
    `Надішли у форматі:\n` +
    `<code>course: slug | Назва | Опис</code>\n\n` +
    `Приклади:\n` +
    `<code>course: to_be | TO BE | Вивчи дієслово to be</code>\n` +
    `<code>course: present_simple | Present Simple | Теперішній простий час</code>\n\n` +
    `<i>(Перший курс у базі буде безкоштовним, інші вимагатимуть Premium)</i>`,
    { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✖ Скасувати', 'adm_courses_list') },
  ).catch(() => {});
};

// ─── Редагувати курс ──────────────────────────────────────────────────────────

export const handleAdminCourseEdit = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const slug = ctx.callbackQuery?.data?.replace('adm_course_edit_', '') ?? '';
  const course = await Course.findOne({ slug }).lean();
  if (!course) return;

  let text = `✏️ <b>Курс: ${e(course.title)}</b>\n\n`;
  text += `Slug: <code>${course.slug}</code>\n`;
  text += `Статус: ${course.isPublished ? '✅ Опублікований' : '📝 Чернетка'}\n\n`;
  text += `<b>Уроки (${course.lessons.length}):</b>\n`;

  const keyboard = new InlineKeyboard();

  course.lessons.forEach((lesson, idx) => {
    text += `${idx + 1}. ${e(lesson.title)} — ${lesson.tests.length} тестів, ${lesson.examples.length} прикладів\n`;
    keyboard
      .text(`${idx + 1}. ${lesson.title}`, `adm_lesson_edit_${slug}_${idx}`)
      .text('🗑', `adm_lesson_del_${slug}_${idx}`)
      .row();
  });

  keyboard
    .text('➕ Додати урок', `adm_lesson_add_${slug}`).row()
    .text('← Назад', 'adm_courses_list');

  await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
};

// ─── Публікація / скриття ─────────────────────────────────────────────────────

export const handleAdminCourseToggle = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  const slug = ctx.callbackQuery?.data?.replace('adm_course_toggle_', '') ?? '';
  const course = await Course.findOne({ slug });
  if (!course) { await ctx.answerCallbackQuery().catch(() => {}); return; }
  course.isPublished = !course.isPublished;
  await course.save();
  await ctx.answerCallbackQuery({ text: course.isPublished ? '✅ Опублікований' : '📝 Прихований', show_alert: true }).catch(() => {});
  await handleAdminCoursesList(ctx);
};

// ─── Видалити курс ────────────────────────────────────────────────────────────

export const handleAdminCourseDel = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});
  const slug = ctx.callbackQuery?.data?.replace('adm_course_del_', '') ?? '';

  await ctx.editMessageText(
    `🗑 Видалити курс <code>${slug}</code>?\n⚠️ Весь прогрес буде видалено!`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('✅ Так', `adm_course_delconfirm_${slug}`)
        .text('✖ Ні', `adm_course_edit_${slug}`),
    },
  ).catch(() => {});
};

export const handleAdminCourseDelConfirm = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});
  const slug = ctx.callbackQuery?.data?.replace('adm_course_delconfirm_', '') ?? '';
  await Promise.all([Course.deleteOne({ slug }), CourseProgress.deleteMany({ courseSlug: slug })]);
  await ctx.answerCallbackQuery({ text: '🗑 Курс видалено', show_alert: true }).catch(() => {});
  await handleAdminCoursesList(ctx);
};

// ─── Урок: редагування ────────────────────────────────────────────────────────

export const handleAdminLessonEdit = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_lesson_edit_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;

  const lesson = course.lessons[lessonIdx];

  let text = `✏️ <b>Урок ${lessonIdx + 1}: ${e(lesson.title)}</b>\n\n`;
  text += `📖 Теорія: <i>${e(lesson.theory.substring(0, 120))}${lesson.theory.length > 120 ? '...' : ''}</i>\n\n`;
  text += `📌 Прикладів: <b>${lesson.examples.length}</b>\n`;
  text += `📝 Тестів: <b>${lesson.tests.length}</b>`;

  const keyboard = new InlineKeyboard()
    .text('📖 Редагувати теорію', `adm_theory_edit_${slug}_${lessonIdx}`).row()
    .text('📌 Приклади', `adm_examples_list_${slug}_${lessonIdx}`)
    .text('📝 Тести', `adm_tests_list_${slug}_${lessonIdx}`).row()
    .text('← До курсу', `adm_course_edit_${slug}`);

  await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
};

// ─── Урок: додати ─────────────────────────────────────────────────────────────

export const handleAdminLessonAdd = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});
  const slug = ctx.callbackQuery?.data?.replace('adm_lesson_add_', '') ?? '';
  adminCourseState.set(ctx.from!.id, { step: 'add_lesson', slug, addedCount: 0 });

  await ctx.editMessageText(
    `➕ <b>Новий урок</b> для курсу <code>${slug}</code>\n\n` +
    `Формат: <code>lesson: Назва | Текст теорії</code>\n\n` +
    `Приклад:\n<code>lesson: Теорія 1: Ствердження | I am / You are / He is — використовується для опису стану.</code>`,
    { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✖ Скасувати', `adm_course_edit_${slug}`) },
  ).catch(() => {});
};

// ─── Урок: видалити ───────────────────────────────────────────────────────────

export const handleAdminLessonDel = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_lesson_del_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;
  const lesson = course.lessons[lessonIdx];

  await ctx.editMessageText(
    `🗑 Видалити урок?\n«<b>${e(lesson.title)}</b>»\n\n⚠️ Всі приклади і тести цього уроку будуть видалені!`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('✅ Так', `adm_lesson_delconfirm_${slug}_${lessonIdx}`)
        .text('✖ Ні', `adm_lesson_edit_${slug}_${lessonIdx}`),
    },
  ).catch(() => {});
};

export const handleAdminLessonDelConfirm = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_lesson_delconfirm_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const course = await Course.findOne({ slug });
  if (!course) return;
  course.lessons.splice(lessonIdx, 1);
  await course.save();

  await ctx.answerCallbackQuery({ text: '🗑 Урок видалено', show_alert: true }).catch(() => {});
  await handleAdminCourseEdit(ctx);
};

// ─── Теорія: редагувати ───────────────────────────────────────────────────────

export const handleAdminTheoryEdit = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_theory_edit_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;

  adminCourseState.set(ctx.from!.id, { step: 'edit_theory', slug, lessonIdx });
  const lesson = course.lessons[lessonIdx];

  await ctx.editMessageText(
    `✏️ <b>Редагування теорії «${e(lesson.title)}»</b>\n\n` +
    `Поточний текст:\n<i>${e(lesson.theory.substring(0, 200))}${lesson.theory.length > 200 ? '...' : ''}</i>\n\n` +
    `Надішли <b>новий текст</b> теорії або /cancel`,
    { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✖ Скасувати', `adm_lesson_edit_${slug}_${lessonIdx}`) },
  ).catch(() => {});
};

// ─── Приклади: список ─────────────────────────────────────────────────────────

export const handleAdminExamplesList = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_examples_list_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;

  const lesson = course.lessons[lessonIdx];
  let text = `📌 <b>Приклади: ${e(lesson.title)}</b>\n\n`;

  const keyboard = new InlineKeyboard();

  if (lesson.examples.length === 0) {
    text += '<i>Прикладів ще немає</i>\n';
  } else {
    lesson.examples.forEach((ex, i) => {
      text += `${i + 1}. ${e(ex)}\n`;
      keyboard.text(`✏️ ${i + 1}`, `adm_example_edit_${slug}_${lessonIdx}_${i}`).text(`🗑 ${i + 1}`, `adm_example_del_${slug}_${lessonIdx}_${i}`).row();
    });
  }

  keyboard
    .text('➕ Додати приклад', `adm_example_add_${slug}_${lessonIdx}`).row()
    .text('← До уроку', `adm_lesson_edit_${slug}_${lessonIdx}`);

  await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
};

// ─── Приклади: додати ─────────────────────────────────────────────────────────

export const handleAdminExampleAdd = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_example_add_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  adminCourseState.set(ctx.from!.id, { step: 'add_example', slug, lessonIdx, addedCount: 0 });

  await ctx.editMessageText(
    `📌 <b>Додати приклад</b>\n\n` +
    `Формат: <code>example: текст прикладу</code>\n` +
    `Можна кілька через новий рядок:\n` +
    `<code>example: I am a student.\nYou are my friend.</code>`,
    { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✖ Скасувати', `adm_examples_list_${slug}_${lessonIdx}`) },
  ).catch(() => {});
};

// ─── Приклади: редагувати ────────────────────────────────────────────────────

export const handleAdminExampleEdit = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_example_edit_', '');
  const parts = withoutPrefix.split('_');
  const exampleIdx = parseInt(parts[parts.length - 1], 10);
  const lessonIdx = parseInt(parts[parts.length - 2], 10);
  const slug = parts.slice(0, -2).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;
  const ex = course.lessons[lessonIdx].examples[exampleIdx];

  adminCourseState.set(ctx.from!.id, { step: 'edit_example', slug, lessonIdx, exampleIdx });

  await ctx.editMessageText(
    `✏️ Редагування прикладу #${exampleIdx + 1}:\n\n<i>${e(ex)}</i>\n\nНадішли новий текст або /cancel`,
    { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✖ Скасувати', `adm_examples_list_${slug}_${lessonIdx}`) },
  ).catch(() => {});
};

// ─── Приклади: видалити ───────────────────────────────────────────────────────

export const handleAdminExampleDel = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_example_del_', '');
  const parts = withoutPrefix.split('_');
  const exampleIdx = parseInt(parts[parts.length - 1], 10);
  const lessonIdx = parseInt(parts[parts.length - 2], 10);
  const slug = parts.slice(0, -2).join('_');

  const course = await Course.findOne({ slug });
  if (!course || !course.lessons[lessonIdx]) return;
  const ex = course.lessons[lessonIdx].examples[exampleIdx];

  await ctx.editMessageText(
    `🗑 Видалити приклад?\n\n<i>${e(ex)}</i>`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('✅ Так', `adm_example_delconfirm_${slug}_${lessonIdx}_${exampleIdx}`)
        .text('✖ Ні', `adm_examples_list_${slug}_${lessonIdx}`),
    },
  ).catch(() => {});
};

export const handleAdminExampleDelConfirm = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_example_delconfirm_', '');
  const parts = withoutPrefix.split('_');
  const exampleIdx = parseInt(parts[parts.length - 1], 10);
  const lessonIdx = parseInt(parts[parts.length - 2], 10);
  const slug = parts.slice(0, -2).join('_');

  const course = await Course.findOne({ slug });
  if (!course || !course.lessons[lessonIdx]) return;
  course.lessons[lessonIdx].examples.splice(exampleIdx, 1);
  await course.save();

  await ctx.answerCallbackQuery({ text: '🗑 Видалено', show_alert: true }).catch(() => {});
  const fakeCtx = { ...ctx, callbackQuery: { ...ctx.callbackQuery, data: `adm_examples_list_${slug}_${lessonIdx}` } } as Context;
  await handleAdminExamplesList(fakeCtx);
};

// ─── Тести: список ────────────────────────────────────────────────────────────

export const handleAdminTestsList = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_tests_list_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;

  const lesson = course.lessons[lessonIdx];
  let text = `📝 <b>Тести: ${e(lesson.title)}</b>\n\n`;

  const keyboard = new InlineKeyboard();

  if (lesson.tests.length === 0) {
    text += '<i>Тестів ще немає</i>\n';
  } else {
    lesson.tests.forEach((test, i) => {
      text += `${i + 1}. ${e(test.question)} → <b>${e(test.options[test.correctIndex])}</b>\n`;
      keyboard.text(`✏️ ${i + 1}`, `adm_test_edit_${slug}_${lessonIdx}_${i}`).text(`🗑 ${i + 1}`, `adm_test_del_${slug}_${lessonIdx}_${i}`).row();
    });
  }

  keyboard
    .text('➕ Додати тест', `adm_test_add_${slug}_${lessonIdx}`).row()
    .text('← До уроку', `adm_lesson_edit_${slug}_${lessonIdx}`);

  await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
};

// ─── Тести: додати ────────────────────────────────────────────────────────────

export const handleAdminTestAdd = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_test_add_', '');
  const parts = withoutPrefix.split('_');
  const lessonIdx = parseInt(parts[parts.length - 1], 10);
  const slug = parts.slice(0, -1).join('_');

  adminCourseState.set(ctx.from!.id, { step: 'add_test', slug, lessonIdx, addedCount: 0 });

  await ctx.editMessageText(
    `📝 <b>Додати тест</b>\n\n` +
    `Формат:\n<code>ctest: Питання | варіант1, варіант2, варіант3 | правильна_відповідь | пояснення (необов.)</code>\n\n` +
    `Приклад:\n<code>ctest: She ___ a teacher. | am, is, are | is | She → he/she/it → is</code>`,
    { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✖ Скасувати', `adm_tests_list_${slug}_${lessonIdx}`) },
  ).catch(() => {});
};

// ─── Тести: редагувати ────────────────────────────────────────────────────────

export const handleAdminTestEdit = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_test_edit_', '');
  const parts = withoutPrefix.split('_');
  const testIdx = parseInt(parts[parts.length - 1], 10);
  const lessonIdx = parseInt(parts[parts.length - 2], 10);
  const slug = parts.slice(0, -2).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;
  const test = course.lessons[lessonIdx].tests[testIdx];

  adminCourseState.set(ctx.from!.id, { step: 'edit_test', slug, lessonIdx, testIdx });

  let text = `✏️ <b>Редагування тесту #${testIdx + 1}</b>\n\n`;
  text += `Питання: <i>${e(test.question)}</i>\n`;
  text += `Варіанти: ${test.options.map(o => e(o)).join(', ')}\n`;
  text += `Відповідь: <b>${e(test.options[test.correctIndex])}</b>\n`;
  if (test.explanation) text += `Пояснення: ${e(test.explanation)}\n`;
  text += `\nНадішли оновлений тест у форматі:\n`;
  text += `<code>ctest: Питання | варіанти | правильна | пояснення</code>\n\nАбо /cancel`;

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().text('✖ Скасувати', `adm_tests_list_${slug}_${lessonIdx}`),
  }).catch(() => {});
};

// ─── Тести: видалити ──────────────────────────────────────────────────────────

export const handleAdminTestDel = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_test_del_', '');
  const parts = withoutPrefix.split('_');
  const testIdx = parseInt(parts[parts.length - 1], 10);
  const lessonIdx = parseInt(parts[parts.length - 2], 10);
  const slug = parts.slice(0, -2).join('_');

  const course = await Course.findOne({ slug }).lean();
  if (!course || !course.lessons[lessonIdx]) return;
  const test = course.lessons[lessonIdx].tests[testIdx];

  await ctx.editMessageText(
    `🗑 Видалити тест #${testIdx + 1}?\n\n<i>${e(test.question)}</i>`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard()
        .text('✅ Так', `adm_test_delconfirm_${slug}_${lessonIdx}_${testIdx}`)
        .text('✖ Ні', `adm_tests_list_${slug}_${lessonIdx}`),
    },
  ).catch(() => {});
};

export const handleAdminTestDelConfirm = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const data = ctx.callbackQuery?.data ?? '';
  const withoutPrefix = data.replace('adm_test_delconfirm_', '');
  const parts = withoutPrefix.split('_');
  const testIdx = parseInt(parts[parts.length - 1], 10);
  const lessonIdx = parseInt(parts[parts.length - 2], 10);
  const slug = parts.slice(0, -2).join('_');

  const course = await Course.findOne({ slug });
  if (!course || !course.lessons[lessonIdx]) return;
  course.lessons[lessonIdx].tests.splice(testIdx, 1);
  await course.save();

  await ctx.answerCallbackQuery({ text: '🗑 Тест видалено', show_alert: true }).catch(() => {});
  const fakeCtx = { ...ctx, callbackQuery: { ...ctx.callbackQuery, data: `adm_tests_list_${slug}_${lessonIdx}` } } as Context;
  await handleAdminTestsList(fakeCtx);
};

// ─── Головний обробник тексту ─────────────────────────────────────────────────

export const handleAdminCourseTextInbound = async (
  ctx: Context,
  next: () => Promise<void>,
): Promise<void> => {
  if (!isAdmin(ctx)) return next();
  const adminId = ctx.from?.id;
  if (!adminId) return next();

  const state = adminCourseState.get(adminId);
  if (!state) return next();

  const text = ctx.message?.text ?? '';
  if (!text) return next();

  if (text === '/cancel') {
    adminCourseState.delete(adminId);
    await ctx.reply('🚫 Скасовано.');
    return;
  }

  // ── Новий курс ────────────────────────────────────────────────────────────
  if (state.step === 'new_course' && text.startsWith('course:')) {
    const parts = text.replace('course:', '').trim().split('|').map((s) => s.trim());
    if (parts.length < 3) {
      await ctx.reply('❌ Формат: <code>course: slug | Назва | Опис</code>', { parse_mode: 'HTML' });
      return;
    }
    const [slug, title, description] = parts;
    if (await Course.findOne({ slug })) { await ctx.reply(`❌ Slug <code>${slug}</code> вже існує`, { parse_mode: 'HTML' }); return; }

    await Course.create({ slug, title, description: description ?? '', isPublished: false });
    adminCourseState.delete(adminId);
    await ctx.reply(
      `✅ <b>Курс створено!</b>\n\n«${e(title)}»\n\nТепер додай уроки.`,
      { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✏️ Редагувати', `adm_course_edit_${slug}`) },
    );
    return;
  }

  // ── Новий урок ────────────────────────────────────────────────────────────
  if (state.step === 'add_lesson' && state.slug && text.startsWith('lesson:')) {
    const parts = text.replace('lesson:', '').trim().split('|').map((s) => s.trim());
    if (parts.length < 2) { await ctx.reply('❌ Формат: <code>lesson: Назва | Текст теорії</code>', { parse_mode: 'HTML' }); return; }
    const [title, theory] = parts;
    const course = await Course.findOne({ slug: state.slug });
    if (!course) return;
    course.lessons.push({ title, theory, examples: [], tests: [] });
    await course.save();
    const lessonIdx = course.lessons.length - 1;
    const addedCount = (state.addedCount ?? 0) + 1;

    await ctx.reply(
      `✅ Урок збережено!\n\n«${e(title)}»\n\nДодати ще один урок?`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('➕ Додати ще', `adm_lesson_add_${state.slug}`)
          .text('✅ Завершити', `adm_course_edit_${state.slug}`),
      },
    );
    adminCourseState.set(adminId, { ...state, addedCount });
    return;
  }

  // ── Новий приклад ─────────────────────────────────────────────────────────
  if (state.step === 'add_example' && state.slug !== undefined && state.lessonIdx !== undefined && text.startsWith('example:')) {
    const raw = text.replace('example:', '').trim();
    const examples = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    const course = await Course.findOne({ slug: state.slug });
    if (!course || !course.lessons[state.lessonIdx]) return;
    course.lessons[state.lessonIdx].examples.push(...examples);
    await course.save();
    const addedCount = (state.addedCount ?? 0) + examples.length;

    await ctx.reply(
      `✅ Збережено ${examples.length} ${examples.length === 1 ? 'приклад' : 'прикладів'}!\n\nДодати ще?`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text('➕ Додати ще', `adm_example_add_${state.slug}_${state.lessonIdx}`)
          .text(`✅ Завершити (${addedCount})`, `adm_examples_list_${state.slug}_${state.lessonIdx}`),
      },
    );
    adminCourseState.set(adminId, { ...state, addedCount });
    return;
  }

  // ── Редагувати приклад ────────────────────────────────────────────────────
  if (state.step === 'edit_example' && state.slug !== undefined && state.lessonIdx !== undefined && state.exampleIdx !== undefined) {
    const course = await Course.findOne({ slug: state.slug });
    if (!course || !course.lessons[state.lessonIdx]) return;
    course.lessons[state.lessonIdx].examples[state.exampleIdx] = text.trim();
    await course.save();
    adminCourseState.delete(adminId);
    await ctx.reply(
      `✅ Приклад оновлено!`,
      { reply_markup: new InlineKeyboard().text('🔙 До прикладів', `adm_examples_list_${state.slug}_${state.lessonIdx}`) },
    );
    return;
  }

  // ── Редагувати теорію ─────────────────────────────────────────────────────
  if (state.step === 'edit_theory' && state.slug !== undefined && state.lessonIdx !== undefined) {
    const course = await Course.findOne({ slug: state.slug });
    if (!course || !course.lessons[state.lessonIdx]) return;
    course.lessons[state.lessonIdx].theory = text.trim();
    await course.save();
    adminCourseState.delete(adminId);
    await ctx.reply(
      `✅ Теорію оновлено!`,
      { reply_markup: new InlineKeyboard().text('🔙 До уроку', `adm_lesson_edit_${state.slug}_${state.lessonIdx}`) },
    );
    return;
  }

  // ── Новий тест ────────────────────────────────────────────────────────────
  if ((state.step === 'add_test' || state.step === 'edit_test') && state.slug !== undefined && state.lessonIdx !== undefined && text.startsWith('ctest:')) {
    const parts = text.replace('ctest:', '').trim().split('|').map((s) => s.trim());
    if (parts.length < 3) { await ctx.reply('❌ Формат: <code>ctest: Питання | варіанти | правильна | пояснення</code>', { parse_mode: 'HTML' }); return; }
    const [question, rawOptions, correctText, explanation] = parts;
    const options = rawOptions.split(',').map((s) => s.trim());
    const correctIndex = options.indexOf(correctText);
    if (correctIndex === -1) { await ctx.reply(`❌ «${correctText}» не серед варіантів: ${options.join(', ')}`); return; }

    const course = await Course.findOne({ slug: state.slug });
    if (!course || !course.lessons[state.lessonIdx]) return;

    const testData = { question, options, correctIndex, explanation: explanation ?? undefined };

    if (state.step === 'edit_test' && state.testIdx !== undefined) {
      course.lessons[state.lessonIdx].tests[state.testIdx] = testData;
      await course.save();
      adminCourseState.delete(adminId);
      await ctx.reply(
        `✅ Тест оновлено!`,
        { reply_markup: new InlineKeyboard().text('🔙 До тестів', `adm_tests_list_${state.slug}_${state.lessonIdx}`) },
      );
    } else {
      course.lessons[state.lessonIdx].tests.push(testData);
      await course.save();
      const addedCount = (state.addedCount ?? 0) + 1;
      adminCourseState.set(adminId, { ...state, addedCount });

      await ctx.reply(
        `✅ Тест збережено!\n\n«${e(question)}»\n\nДодати ще один тест для цієї теорії?`,
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard()
            .text('➕ Додати ще', `adm_test_add_${state.slug}_${state.lessonIdx}`)
            .text(`✅ Завершити (${addedCount})`, `adm_tests_list_${state.slug}_${state.lessonIdx}`),
        },
      );
    }
    return;
  }

  return next();
};

export const handleForceMenuUpdate = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;

  await ctx.reply('⏳ Починаю розсилку оновленого меню всім користувачам. Це може зайняти трохи часу...');

  try {
    // Оптимізація: витягуємо тільки telegramId
    const users = await User.find({}).select('telegramId').lean();
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        await ctx.api.sendMessage(
          user.telegramId,
          "Меню оновлено 🍪",
          { 
            parse_mode: 'HTML',
            reply_markup: createMainMenu() // Переконайся, що функція імпортована
          }
        );
        successCount++;
      } catch (err) {
        failCount++;
      } finally {
        // ⚠️ Гарантована затримка для захисту від ECONNRESET
        await new Promise((res) => setTimeout(res, 50));
      }
    }

    await ctx.reply(
      `✅ <b>Оновлення меню успішно завершено!</b>\n\n` +
      `Отримали нові кнопки: <b>${successCount}</b>\n` +
      `Заблокували бота: <b>${failCount}</b>`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Помилка примусового оновлення меню:', error);
    await ctx.reply('❌ Критична помилка під час оновлення.');
  }
};