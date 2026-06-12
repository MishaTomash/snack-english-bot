import { Context, InlineKeyboard } from 'grammy';
import { Course } from '../../models/Course';
import { config } from '../../config';
import { User } from '../../models/User';
import { createMainMenu } from '../keyboards/main';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HTML = { parse_mode: 'HTML' as const };
const isAdmin = (ctx: Context) => ctx.from?.id === config.ADMIN_ID;

// In-memory state: what the admin is currently entering
export const adminCourseStates = new Map<number, { action: string; courseId?: string }>();

// ─── 1. Головне меню курсів ───────────────────────────────────────────────────

export const handleAdminCoursesMenu = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;

  const courses = await Course.find().lean();
  const keyboard = new InlineKeyboard();

  courses.forEach(c => {
    keyboard.text(`${c.emoji} ${c.title}${c.isPremium ? ' 💎' : ''}`, `adm_c_open_${c._id}`).row();
  });
  keyboard.text('➕ Створити новий курс', 'adm_c_new').row();

  const text = '📚 <b>Керування курсами</b>\nОбери курс для редагування або створи новий.';
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard }).catch(() => {});
  } else {
    await ctx.reply(text, { ...HTML, reply_markup: keyboard });
  }
};

// ─── 2. Меню конкретного курсу ────────────────────────────────────────────────

export const handleAdminCourseSelect = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  const courseId = ctx.callbackQuery?.data?.replace('adm_c_open_', '');
  if (!courseId) return;

  const course = await Course.findById(courseId).lean();
  if (!course) return ctx.answerCallbackQuery('❌ Курс не знайдено');

  const keyboard = new InlineKeyboard()
    .text('➕ Відео', `adm_c_addvid_${courseId}`)
    .text('➕ Тест', `adm_c_addtest_${courseId}`).row()
    .text('🗑 Видалити курс', `adm_c_del_${courseId}`).row()
    .text('🔙 Назад', 'adm_c_back');

  await ctx.editMessageText(
    `📘 <b>${course.emoji} ${course.title}</b>${course.isPremium ? ' 💎' : ''}\n` +
    `🎬 Відео: <b>${course.videos.length}</b> | 📝 Тести: <b>${course.tests.length}</b>\n\n` +
    `Що будемо робити?`,
    { ...HTML, reply_markup: keyboard }
  ).catch(() => {});
};

// ─── 3. Підказки для введення даних ──────────────────────────────────────────

export const handleAdminCourseActionPrompt = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  const data = ctx.callbackQuery?.data;
  const telegramId = ctx.from?.id;
  if (!data || !telegramId) return;

  if (data === 'adm_c_new') {
    adminCourseStates.set(telegramId, { action: 'new_course' });
    await ctx.reply(
      '✍️ <b>Новий курс</b>\n\nФормат: <code>Назва | Емодзі | true/false</code>\n' +
      'Приклад: <code>Present Simple | 📘 | false</code>\n\n' +
      '<i>/cancel_course — скасувати</i>',
      HTML
    );
  }
  else if (data.startsWith('adm_c_addvid_')) {
    const courseId = data.replace('adm_c_addvid_', '');
    adminCourseStates.set(telegramId, { action: 'add_video', courseId });
    await ctx.reply(
      '✍️ <b>Додати відео</b>\n\nФормат (кожне з нового рядка):\n' +
      '<code>Назва відео | https://youtu.be/...</code>\n\n' +
      '<i>/cancel_course — скасувати</i>',
      HTML
    );
  }
  else if (data.startsWith('adm_c_addtest_')) {
    const courseId = data.replace('adm_c_addtest_', '');
    adminCourseStates.set(telegramId, { action: 'add_test', courseId });
    await ctx.reply(
      '✍️ <b>Додати питання тесту</b>\n\nФормат (кожне з нового рядка):\n' +
      '<code>Назва тесту | Питання | варіант1, варіант2 | індекс правильної (від 0) | пояснення</code>\n\n' +
      'Приклад:\n' +
      '<code>Заперечення | I ___ hungry | am not, is not | 0 | "am not" — це заперечення для I</code>\n\n' +
      '💡 Кілька питань — кожне з нового рядка\n' +
      '<i>/cancel_course — скасувати</i>',
      HTML
    );
  }
  else if (data.startsWith('adm_c_del_')) {
    const courseId = data.replace('adm_c_del_', '');
    await Course.findByIdAndDelete(courseId);
    await ctx.answerCallbackQuery('✅ Курс видалено!');
    await handleAdminCoursesMenu(ctx);
    return;
  }

  await ctx.answerCallbackQuery().catch(() => {});
};

// ─── 4. Обробка введеного тексту ─────────────────────────────────────────────

export const handleAdminCourseTextInput = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  const telegramId = ctx.from?.id;
  const text = ctx.message?.text?.trim();
  if (!telegramId || !text) return;

  // Cancel command
  if (text === '/cancel_course') {
    adminCourseStates.delete(telegramId);
    return ctx.reply('❌ Скасовано.', HTML);
  }

  const state = adminCourseStates.get(telegramId);
  if (!state) return;

  // ── New course ──
  if (state.action === 'new_course') {
    const parts = text.split('|').map(p => p.trim());
    if (parts.length < 3) {
      return ctx.reply('❌ Невірний формат. Потрібно: <code>Назва | Емодзі | true/false</code>', HTML);
    }

    const [title, emoji, premiumStr] = parts;
    const isPremium = premiumStr.toLowerCase() === 'true';

    if (!title || !emoji) {
      return ctx.reply('❌ Назва та емодзі не можуть бути порожніми.', HTML);
    }

    try {
      const course = await Course.create({ title, emoji, isPremium, videos: [], tests: [] });
      adminCourseStates.delete(telegramId);
      await ctx.reply(
        `✅ <b>Курс створено!</b>\n\n${emoji} <b>${title}</b>${isPremium ? ' 💎' : ''}\n\nТепер можна додати відео та тести.`,
        HTML
      );
      // Show the new course menu right away
      if (ctx.callbackQuery === undefined) {
        const keyboard = new InlineKeyboard()
          .text('➕ Відео', `adm_c_addvid_${course._id}`)
          .text('➕ Тест', `adm_c_addtest_${course._id}`).row()
          .text('🔙 До списку', 'adm_c_back');
        await ctx.reply(`📘 <b>${emoji} ${title}</b> — що додамо?`, { ...HTML, reply_markup: keyboard });
      }
    } catch (err) {
      console.error('Course create error:', err);
      await ctx.reply('❌ Сталася помилка при збереженні. Перевірте формат і спробуйте ще раз.', HTML);
    }
    return;
  }

  // ── Add videos ──
  if (state.action === 'add_video' && state.courseId) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const videos: { title: string; url: string }[] = [];
    const errors: string[] = [];

    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) {
        errors.push(`⚠️ <code>${line}</code> — пропущено (невірний формат)`);
        continue;
      }
      videos.push({ title: parts[0], url: parts[1] });
    }

    if (!videos.length) {
      return ctx.reply('❌ Жодного відео не вдалося розпізнати. Перевірте формат.', HTML);
    }

    try {
      await Course.findByIdAndUpdate(
        state.courseId,
        { $push: { videos: { $each: videos } } }
      );
      adminCourseStates.delete(telegramId);

      let reply = `✅ Додано <b>${videos.length}</b> відео!\n`;
      videos.forEach((v, i) => { reply += `\n${i + 1}. ${v.title}`; });
      if (errors.length) reply += `\n\n${errors.join('\n')}`;

      await ctx.reply(reply, HTML);
    } catch (err) {
      console.error('Add video error:', err);
      await ctx.reply('❌ Помилка при збереженні відео.', HTML);
    }
    return;
  }

  // ── Add test questions ──
  if (state.action === 'add_test' && state.courseId) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Group lines by test name
    const testMap = new Map<string, { question: string; options: string[]; correctIndex: number; explanation?: string }[]>();
    const errors: string[] = [];

    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 4) {
        errors.push(`⚠️ <code>${line}</code> — пропущено (потрібно мінімум 4 поля)`);
        continue;
      }

      const [testName, question, optionsStr, correctIndexStr, explanation] = parts;
      const options = optionsStr.split(',').map(o => o.trim()).filter(Boolean);
      const correctIndex = parseInt(correctIndexStr, 10);

      if (!testName || !question || options.length < 2 || isNaN(correctIndex) || correctIndex >= options.length) {
        errors.push(`⚠️ <code>${line}</code> — невірні дані`);
        continue;
      }

      if (!testMap.has(testName)) testMap.set(testName, []);
      testMap.get(testName)!.push({
        question,
        options,
        correctIndex,
        ...(explanation ? { explanation } : {}),
      });
    }

    if (!testMap.size) {
      return ctx.reply('❌ Жодного питання не вдалося розпізнати. Перевірте формат.', HTML);
    }

    try {
      const course = await Course.findById(state.courseId);
      if (!course) return ctx.reply('❌ Курс не знайдено.', HTML);

      let totalQuestions = 0;
      const testNames: string[] = [];

      for (const [title, questions] of testMap.entries()) {
        // Check if test with this title already exists → append questions
        const existing = course.tests.find((t: any) => t.title === title);
        if (existing) {
          existing.questions.push(...questions);
        } else {
          course.tests.push({ title, questions } as any);
        }
        totalQuestions += questions.length;
        testNames.push(`📝 ${title} (${questions.length} питань)`);
      }

      await course.save();
      adminCourseStates.delete(telegramId);

      let reply = `✅ Збережено <b>${totalQuestions}</b> питань у <b>${testMap.size}</b> тест(ах):\n\n`;
      reply += testNames.join('\n');
      if (errors.length) reply += `\n\n${errors.join('\n')}`;

      await ctx.reply(reply, HTML);
    } catch (err) {
      console.error('Add test error:', err);
      await ctx.reply('❌ Помилка при збереженні тесту. Перевірте формат і спробуйте ще раз.', HTML);
    }
    return;
  }
};
const sendWithRetry = async (fn: () => Promise<unknown>): Promise<'ok' | 'fail'> => {
    let attempts = 0;
    while (attempts < 3) {
        try {
            await fn();
            return 'ok';
        } catch (err: any) {
            if (err?.error_code === 429) {
                // Telegram каже "зачекай" — чекаємо і пробуємо ще раз
                const waitMs = (err?.parameters?.retry_after ?? 5) * 1000;
                console.warn(`⚠️ 429 Too Many Requests — чекаю ${waitMs}ms`);
                await new Promise(res => setTimeout(res, waitMs));
                attempts++;
            } else {
                // Юзер заблокував бота або інша помилка — пропускаємо
                return 'fail';
            }
        }
    }
    return 'fail';
};
// ─── 5. Примусове оновлення меню ─────────────────────────────────────────────

export const handleForceMenuUpdate = async (ctx: Context) => {
    if (!isAdmin(ctx)) return;

    await ctx.reply('⏳ Починаю розсилку оновленого меню...');

    try {
        const users = await User.find({}).select('telegramId').lean();
        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            const result = await sendWithRetry(() =>
                ctx.api.sendMessage(user.telegramId, '🍪 Меню оновлено!', {
                    parse_mode: 'HTML',
                    reply_markup: createMainMenu(),
                })
            );
            result === 'ok' ? successCount++ : failCount++;
            await new Promise(res => setTimeout(res, 50));
        }

        await ctx.reply(
            `✅ <b>Готово!</b>\n\nОтримали: <b>${successCount}</b>\nЗаблокували бота: <b>${failCount}</b>`,
            { parse_mode: 'HTML' }
        );
    } catch (err) {
        console.error('Force menu update error:', err);
        await ctx.reply('❌ Критична помилка під час оновлення.');
    }
};