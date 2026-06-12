import { Context, InlineKeyboard, NextFunction } from 'grammy';
import { config } from '../../config';
import { createAdminMenu } from '../keyboards/admin';
import { createMainMenu } from '../keyboards/main';
import { Word } from '../../models/Word';
import { TestQuestion } from '../../models/TestQuestion';
import { Text } from '../../models/Text';
import { User } from '../../models/User';
import { TopCycle } from '../../models/TopCycle';

// ─── Константи ───────────────────────────────────────────────────────────────

const ALLOWED_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type Level = typeof ALLOWED_LEVELS[number];

const PAGE_SIZE = 15;

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
    const name = u.firstName ? escapeHtml(u.firstName) : 'Анонім';
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
    '🎯 *Шаблон для додавання міні-тесту (можна кидати одразу кілька рядків):*\n\n' +
    '`test: A1 | Як буде "вода"? | school, water, window, bread | water | Water перекладається як вода.`',
    { parse_mode: 'Markdown' }
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

// ── 1. БАГАТО СЛІВ (з опціональними прив'язаними тестами) ─────────────────
  if (textData.includes('word:')) {
    try {
      // Розбиваємо повідомлення на рядки і беремо тільки ті, що починаються на 'word:'
      const lines = textData.split('\n').filter(line => line.trim().startsWith('word:'));
      
      if (lines.length === 0) return;

      let wordsAdded = 0;
      let testsAdded = 0;
      const errors: string[] = [];

      for (const line of lines) {
        try {
          const parts = line.replace('word:', '').trim().split('|').map((s) => s.trim());

          if (parts.length < 4) {
            errors.push(`⚠️ Мало полів у рядку: \`${line.substring(0, 20)}...\``);
            continue; // Пропускаємо цей рядок, але йдемо далі
          }

          const [inputLevel, english, ukrainian, transcription, question, rawOptions, correctAnswerText, explanation] = parts;

          if (!ALLOWED_LEVELS.includes(inputLevel as Level)) {
            errors.push(`⚠️ Невідомий рівень *${inputLevel}* у слові: ${english}`);
            continue;
          }

          // Зберігаємо слово
          const newWord = await Word.create({
            level: inputLevel as Level,
            english,
            ukrainian,
            transcription,
          });
          wordsAdded++;

          // Якщо передані поля тесту — зберігаємо тест
          if (question && rawOptions && correctAnswerText) {
            const options = rawOptions.split(',').map((s) => s.trim());

            if (options.length < 2) {
              errors.push(`⚠️ Слово *${english}* додано, але тест пропущено (менше 2 варіантів).`);
            } else {
              const correctOptionIndex = options.indexOf(correctAnswerText);
              if (correctOptionIndex === -1) {
                errors.push(`⚠️ Слово *${english}* додано, але правильна відповідь не знайдена в тесті.`);
              } else {
                await TestQuestion.create({
                  level: inputLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
                  question,
                  options,
                  correctOptionIndex,
                  wordId: newWord._id,  // 🔗 Прив'язка до слова
                  explanation: explanation ? explanation : undefined
                });
                testsAdded++;
              }
            }
          }
        } catch (err) {
          console.error('Помилка додавання рядка:', err);
          errors.push(`❌ Помилка сервера при обробці: \`${line.substring(0, 20)}...\``);
        }
      }

      // Формуємо фінальний звіт
      let finalMessage = `✅ *Масове додавання завершено!*\n\n📚 Додано слів: *${wordsAdded}*\n🎯 Додано тестів: *${testsAdded}*`;
      
      if (errors.length > 0) {
        finalMessage += `\n\n⚠️ *Попередження:*\n${errors.join('\n')}`;
      }

      return ctx.reply(finalMessage, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Помилка масового додавання:', error);
      return ctx.reply('❌ Сталася критична помилка при масовому збереженні.');
    }
  }

// ── 2. ТЕСТ (загальний, без прив'язки до слова) ───────────────────────────
  if (textData.includes('test:')) {
    try {
      // Розбиваємо весь текст на рядки і беремо тільки ті, що починаються на 'test:'
      const lines = textData.split('\n').filter(line => line.trim().startsWith('test:'));
      
      if (lines.length === 0) return; // Якщо тестів немає, йдемо далі

      let addedCount = 0;
      let errors: string[] = [];

      for (const line of lines) {
        try {
          const parts = line.replace('test:', '').trim().split('|').map((s) => s.trim());

          // Перевіряємо чи є хоча б 4 поля (пояснення - 5-те, воно не обов'язкове)
          if (parts.length < 4) {
            errors.push(`❌ Мало полів у рядку: <code>${line.substring(0, 30)}...</code>`);
            continue;
          }

          const [inputLevel, question, rawOptions, correctAnswerText, explanation] = parts;

          if (!['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(inputLevel)) {
            errors.push(`❌ Невідомий рівень (<b>${inputLevel}</b>) для: <code>${question}</code>`);
            continue;
          }

          const options = rawOptions.split(',').map((s) => s.trim());
          if (options.length < 2) {
            errors.push(`❌ Мало варіантів (мінімум 2) для: <code>${question}</code>`);
            continue;
          }

          const correctOptionIndex = options.indexOf(correctAnswerText);
          if (correctOptionIndex === -1) {
            errors.push(`❌ Відповідь '<b>${correctAnswerText}</b>' не знайдена серед варіантів: <code>${question}</code>`);
            continue;
          }

          // Створюємо тест, додаємо пояснення якщо воно є
          await TestQuestion.create({
            level: inputLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
            question,
            options,
            correctOptionIndex,
            explanation: explanation && explanation.trim() !== '' ? explanation.trim() : undefined
          });

          addedCount++;
        } catch (err) {
          console.error('Помилка обробки рядка тесту:', err);
          errors.push(`❌ Внутрішня помилка обробки: <code>${line.substring(0, 30)}...</code>`);
        }
      }

      // 🔥 ЗМІНЕНО: Використовуємо HTML, щоб `___` у текстах не ламали бота!
      let replyText = `✅ <b>Успішно додано тестів: ${addedCount}</b>\n`;
      if (errors.length > 0) {
        // Екрануємо спецсимволи < і >, щоб не зламати HTML
        const safeErrors = errors.map(e => e.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        replyText += `\n⚠️ <b>Помилки:</b>\n${safeErrors.join('\n')}`;
      }

      return ctx.reply(replyText, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Критична помилка додавання тестів:', error);
      return ctx.reply('❌ <b>Помилка при збереженні тестів на сервері.</b>', { parse_mode: 'HTML' });
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
  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => { });

  try {
    // Оптимізація: завантажуємо ЛИШЕ необхідні поля для списку (економимо пам'ять сервера)
    const users = await User.find({}).select('firstName username telegramId level').lean();
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
  await ctx.answerCallbackQuery().catch(() => { });

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

// ЗНАЙДИ функцию handleAdminMessages і додай цей блок ПЕРЕД блоком розсилки (перед `if (adminState.get(adminId) !== 'waiting_for_broadcast') return next();`):

export const handleAdminMessages = async (ctx: Context, next: NextFunction) => {
  const adminId = ctx.from?.id;
  if (!adminId) return next();

  // Отримуємо поточний стан (що саме зараз вводить адмін)
  const state = adminState.get(adminId);

  // Якщо адмін нічого не вводить — ПРОПУСКАЄМО далі до кнопок меню!
  if (!state) return next();

  // Спільна обробка команди скасування
  if (ctx.message?.text === '/cancel') {
    adminState.delete(adminId);
    return ctx.reply('🚫 Дія скасована.');
  }

  // --- ОБРОБКА ДАТИ ТОПУ ---
  if (state === 'waiting_for_top_date') {
    const textData = ctx.message?.text ?? '';
    const parts = textData.split('.');
    if (parts.length === 3) {
      const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T23:59:59Z`);
      if (!isNaN(date.getTime())) {
        await TopCycle.findOneAndUpdate({ isActive: true }, { endDate: date });
        adminState.delete(adminId);
        return ctx.reply(`✅ Дату успішно змінено на ${date.toLocaleDateString('uk-UA')}!`);
      }
    }
    return ctx.reply('❌ Неправильний формат. Використовуйте ДД.ММ.РРРР (наприклад, 31.05.2026). Або /cancel');
  }

  // --- ОБРОБКА РОЗСИЛКИ ---
  if (state === 'waiting_for_broadcast') {
    adminState.delete(adminId);
    await ctx.reply('⏳ Починаю розсилку...');

    try {
      // Оптимізація: завантажуємо ЛИШЕ telegramId (економить пам'ять)
      const users = await User.find({}).select('telegramId').lean();
      let successCount = 0;
      let failCount = 0;

      for (const user of users) {
        try {
          await ctx.copyMessage(user.telegramId);
          successCount++;
        } catch (err) {
          // Юзер заблокував бота або видалив чат
          failCount++;
        } finally {
          // ⚠️ НАЙВАЖЛИВІШЕ: Пауза ПОВИННА бути тут. 
          // Вона спрацює навіть якщо юзер заблокував бота!
          await new Promise((res) => setTimeout(res, 50));
        }
      }

      return ctx.reply(
        `✅ <b>Розсилка завершена!</b>\n\nУспішно: <b>${successCount}</b>\nЗаблокували бота: <b>${failCount}</b>`,
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      console.error('Помилка розсилки:', error);
      return ctx.reply('❌ Критична помилка під час розсилки.');
    }
  }

  // Якщо стан якийсь інший (хоча такого не має бути) — пускаємо далі
  return next();
};