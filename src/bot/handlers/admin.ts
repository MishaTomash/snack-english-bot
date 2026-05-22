import { Context, InlineKeyboard, NextFunction } from 'grammy';
import { config } from '../../config';
import { createAdminMenu } from '../keyboards/admin';
import { createMainMenu } from '../keyboards/main';
import { Word } from '../../models/Word';
import { TestQuestion } from '../../models/TestQuestion';
import { Text } from '../../models/Text';
import { User } from '../../models/User';

// ─── Константи ───────────────────────────────────────────────────────────────

const ALLOWED_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type Level = typeof ALLOWED_LEVELS[number];

const PAGE_SIZE = 20;

// ─── Стан для розсилки ───────────────────────────────────────────────────────

export const adminState = new Map<number, string>();

// ─── Хелпер: екранування HTML ────────────────────────────────────────────────

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// ─── Хелпер: перевірка адміна ────────────────────────────────────────────────

const isAdmin = (ctx: Context): boolean => ctx.from?.id === config.ADMIN_ID;

// ─── Хелпер: побудова сторінки списку юзерів ─────────────────────────────────

const buildUsersPage = (
  users: any[],
  page: number,
): { text: string; keyboard: InlineKeyboard } => {
  const totalUsers = users.length;
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, totalUsers);

  let text = `👥 <b>Список користувачів</b>\n`;
  text += `Всього: <b>${totalUsers}</b> | Сторінка ${page + 1}/${totalPages}\n\n`;

  for (let i = start; i < end; i++) {
    const u = users[i];
    const level = u.level ?? 'Не обрано';
    const name = escapeHtml(u.firstName ?? 'Анонім');
    const username = u.username ? ` (@${u.username})` : '';
    text += `${i + 1}. <b>${name}</b>${username} | <code>${u.telegramId}</code> | ${level}\n`;
  }

  const keyboard = new InlineKeyboard();
  if (page > 0) keyboard.text('⬅️', `admin_users_${page - 1}`);
  if (page < totalPages - 1) keyboard.text('➡️', `admin_users_${page + 1}`);

  return { text, keyboard };
};

// ─── /admin команда ───────────────────────────────────────────────────────────

export const handleAdminCommand = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;

  await ctx.reply(
    '👨‍💻 *Ласкаво просимо до Адмін-панелі!*\n\nОберіть дію на клавіатурі знизу.',
    { parse_mode: 'Markdown', reply_markup: createAdminMenu() },
  );
};

// ─── Вихід з адмінки ─────────────────────────────────────────────────────────

export const handleExitAdmin = async (ctx: Context) => {
  await ctx.reply('🚪 Ви вийшли з режиму адміністратора.', {
    reply_markup: createMainMenu(),
  });
};

// ─── Підказки для додавання контенту ─────────────────────────────────────────

export const handleAddWordPrompt = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.reply(
    '📝 *Шаблон для додавання слова зі зв\'язаним тестом:*\n\n' +
    '`word: A2 | Challenge | Виклик | Челендж | Як перекласти "Challenge"? | option1, option2, option3, option4 | правильна_відповідь`\n\n' +
    '📌 Поля: *рівень | англ | укр | транскрипція | питання тесту | варіанти через кому | правильна відповідь*\n\n' +
    '💡 Якщо питання тесту не потрібне — надішли лише 4 поля:\n' +
    '`word: A2 | Challenge | Виклик | Челендж`',
    { parse_mode: 'Markdown' },
  );
};

export const handleAddTestPrompt = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.reply(
    '🎯 *Шаблон для додавання окремого міні-тесту:*\n\n`test: A1 | Як буде "вода"? | school, water, window, bread | water`',
    { parse_mode: 'Markdown' },
  );
};

export const handleAddTextPrompt = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.reply(
    '📖 *Шаблон для додавання тексту:*\n\n`text: A2 | I love coding in TypeScript. | Я люблю програмувати на TypeScript.`',
    { parse_mode: 'Markdown' },
  );
};

// ─── Головний обробник вхідного тексту адмінки ────────────────────────────────

export const handleAdminTextInbound = async (ctx: Context, next: () => Promise<void>) => {
  if (!isAdmin(ctx)) return next();

  const textData = ctx.message?.text;
  if (!textData) return next();

  // ── 1. СЛОВО (з опціональним прив'язаним тестом) ─────────────────────────
  if (textData.startsWith('word:')) {
    try {
      const parts = textData.replace('word:', '').trim().split('|').map((s) => s.trim());

      if (parts.length < 4) {
        return ctx.reply(
          '❌ Потрібно мінімум 4 поля:\n`word: рівень | англ | укр | транскрипція`\n\nАбо 7 полів для слова + тест:\n`word: рівень | англ | укр | транскрипція | питання | варіанти | правильна`',
          { parse_mode: 'Markdown' },
        );
      }

      const [inputLevel, english, ukrainian, transcription, question, rawOptions, correctAnswerText] = parts;

      if (!ALLOWED_LEVELS.includes(inputLevel as Level)) {
        return ctx.reply(
          `❌ Невідомий рівень: *${inputLevel}*. Дозволені: ${ALLOWED_LEVELS.join(', ')}`,
          { parse_mode: 'Markdown' },
        );
      }

      // Зберігаємо слово
      const newWord = await Word.create({
        level: inputLevel as Level,
        english,
        ukrainian,
        transcription,
      });

      // Якщо передані поля тесту — зберігаємо тест прив'язаний до цього слова
      let testSaved = false;
      if (question && rawOptions && correctAnswerText) {
        const options = rawOptions.split(',').map((s) => s.trim());

        if (options.length < 2) {
          await ctx.reply('⚠️ Слово збережено, але тест має хоча б 2 варіанти. Тест не збережено.');
        } else {
          const correctOptionIndex = options.indexOf(correctAnswerText);
          if (correctOptionIndex === -1) {
            await ctx.reply(
              `⚠️ Слово збережено, але правильна відповідь \`${correctAnswerText}\` не знайдена серед варіантів. Тест не збережено.`,
              { parse_mode: 'Markdown' },
            );
          } else {
            await TestQuestion.create({
              level: inputLevel as Level,
              question,
              options,
              correctOptionIndex,
              wordId: newWord._id,  // 🔗 Прив'язка до слова
            });
            testSaved = true;
          }
        }
      }

      const successMsg = testSaved
        ? `✅ *Слово і тест успішно збережено!*\n\n🔗 Тест прив'язаний до слова «${english}»`
        : `✅ *Слово успішно додано!*\n\n_(Тест не додавався — передані лише базові поля)_`;

      return ctx.reply(successMsg, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Помилка додавання слова:', error);
      return ctx.reply('❌ Помилка при збереженні.');
    }
  }

  // ── 2. ТЕСТ (загальний, без прив'язки до слова) ───────────────────────────
  if (textData.startsWith('test:')) {
    try {
      const parts = textData.replace('test:', '').trim().split('|').map((s) => s.trim());
      if (parts.length < 4) {
        return ctx.reply(
          '❌ Потрібно 4 поля: `test: рівень | питання | варіанти через кому | правильна відповідь`',
          { parse_mode: 'Markdown' },
        );
      }
      const [inputLevel, question, rawOptions, correctAnswerText] = parts;
      if (!ALLOWED_LEVELS.includes(inputLevel as Level)) {
        return ctx.reply(`❌ Невідомий рівень: *${inputLevel}*`, { parse_mode: 'Markdown' });
      }
      const options = rawOptions.split(',').map((s) => s.trim());
      if (options.length < 2) {
        return ctx.reply('❌ Потрібно хоча б 2 варіанти відповідей.', { parse_mode: 'Markdown' });
      }
      const correctOptionIndex = options.indexOf(correctAnswerText);
      if (correctOptionIndex === -1) {
        return ctx.reply(
          `❌ Правильна відповідь \`${correctAnswerText}\` не знайдена серед варіантів: \`${options.join(', ')}\``,
          { parse_mode: 'Markdown' },
        );
      }
      await TestQuestion.create({ level: inputLevel as Level, question, options, correctOptionIndex });
      return ctx.reply('✅ *Загальний міні-тест успішно додано!*', { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Помилка додавання тесту:', error);
      return ctx.reply('❌ Помилка при збереженні тесту.');
    }
  }

  // ── 3. ТЕКСТ ──────────────────────────────────────────────────────────────
  if (textData.startsWith('text:')) {
    try {
      const parts = textData.replace('text:', '').trim().split('|').map((s) => s.trim());
      if (parts.length < 3) {
        return ctx.reply(
          '❌ Потрібно 3 поля: `text: рівень | англійський текст | переклад`',
          { parse_mode: 'Markdown' },
        );
      }
      const [inputLevel, english, ukrainian] = parts;
      if (!ALLOWED_LEVELS.includes(inputLevel as Level)) {
        return ctx.reply(`❌ Невідомий рівень: *${inputLevel}*`, { parse_mode: 'Markdown' });
      }
      await Text.create({ level: inputLevel as Level, englishText: english, ukrainianTranslation: ukrainian });
      return ctx.reply(
        `✅ *Текст успішно додано!*\n\n📊 Рівень: *${inputLevel}*\n🇬🇧 _${english}_\n🇺🇦 _${ukrainian}_`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      console.error('Помилка додавання тексту:', error);
      return ctx.reply('❌ Помилка при збереженні тексту.');
    }
  }

  return next();
};

// ─── Статистика БД ────────────────────────────────────────────────────────────

export const handleAdminStats = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;

  try {
    const [totalUsers, premiumUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isPremium: true }),
    ]);

    const levelStats = await Promise.all(
      ALLOWED_LEVELS.map(async (lvl) => {
        const [words, tests, texts, linkedTests] = await Promise.all([
          Word.countDocuments({ level: lvl }),
          TestQuestion.countDocuments({ level: lvl }),
          Text.countDocuments({ level: lvl }),
          TestQuestion.countDocuments({ level: lvl, wordId: { $ne: null } }),
        ]);
        return { lvl, words, tests, texts, linkedTests };
      }),
    );

    let message = `📊 *ДЕТАЛЬНА СТАТИСТИКА БАЗИ ДАНИХ*\n\n`;
    message += `👥 Усього користувачів: *${totalUsers}*\n`;
    message += `💎 З них з Premium: *${premiumUsers}*\n\n`;
    message += `🗂 *Наповнення контентом за рівнями:*\n`;

    for (const { lvl, words, tests, texts, linkedTests } of levelStats) {
      message += `\n📈 *Рівень ${lvl}:*\n`;
      message += `  ▫️ Слова/Фрази: *${words}*\n`;
      message += `  ▫️ Міні-тести (всього): *${tests}* _(прив'язані до слів: ${linkedTests})_\n`;
      message += `  ▫️ Тексти: *${texts}*\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Помилка збору статистики:', error);
    await ctx.reply('❌ Не вдалося завантажити статистику.');
  }
};

// ─── Список юзерів ────────────────────────────────────────────────────────────

export const handleAdminUsers = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

  try {
    const users = await User.find({}).lean();
    if (users.length === 0) {
      return ctx.reply('📭 У боті поки немає зареєстрованих користувачів.');
    }
    const { text, keyboard } = buildUsersPage(users, 0);
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (error) {
    console.error('Помилка при отриманні користувачів:', error);
    await ctx.reply('❌ Помилка при завантаженні списку.');
  }
};

// ─── Пагінація юзерів ────────────────────────────────────────────────────────

export const handleAdminUsersPagination = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const page = parseInt(ctx.callbackQuery?.data?.split('_')[2] ?? '', 10);
  if (isNaN(page)) return;

  try {
    const users = await User.find({}).lean();
    const { text, keyboard } = buildUsersPage(users, page);

    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard })
      .catch((err: any) => {
        if (!err?.description?.includes('message is not modified')) {
          console.error('Помилка пагінації юзерів:', err);
        }
      });
  } catch (error) {
    console.error('Помилка навігації по юзерах:', error);
  }
};

// ─── Розсилка ─────────────────────────────────────────────────────────────────

export const handleBroadcastStart = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  adminState.set(ctx.from!.id, 'waiting_for_broadcast');
  await ctx.reply(
    '📢 <b>Режим розсилки</b>\n\nВідправ повідомлення для розсилки.\n\n<i>Для скасування напиши /cancel</i>',
    { parse_mode: 'HTML' },
  );
};

export const handleAdminMessages = async (ctx: Context, next: NextFunction) => {
  const adminId = ctx.from?.id;
  if (!adminId) return next();
  if (adminState.get(adminId) !== 'waiting_for_broadcast') return next();

  if (ctx.message?.text === '/cancel') {
    adminState.delete(adminId);
    return ctx.reply('🚫 Розсилку скасовано.');
  }

  adminState.delete(adminId);
  await ctx.reply('⏳ Починаю розсилку...');

  try {
    const users = await User.find({}).lean();
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        await ctx.copyMessage(user.telegramId);
        successCount++;
        await new Promise((res) => setTimeout(res, 50));
      } catch {
        failCount++;
      }
    }

    await ctx.reply(
      `✅ <b>Розсилка завершена!</b>\n\nУспішно: <b>${successCount}</b>\nЗаблокували бота: <b>${failCount}</b>`,
      { parse_mode: 'HTML' },
    );
  } catch (error) {
    console.error('Помилка розсилки:', error);
    await ctx.reply('❌ Критична помилка під час розсилки.');
  }
};