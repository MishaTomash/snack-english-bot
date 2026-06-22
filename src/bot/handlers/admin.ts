import { Context, InlineKeyboard, NextFunction } from 'grammy';
import { config } from '../../config';
import { createAdminMenu } from '../keyboards/admin';
import { createMainMenu } from '../keyboards/main';
import { Word } from '../../models/Word';
import { TestQuestion } from '../../models/TestQuestion';
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
    `📝 <b>Шаблон для додавання слова зі зв'язаним тестом:</b>\n\n` +
    `<code>word: A2 | Challenge | Виклик | Челендж | Як перекласти "Challenge"? | option1, option2, option3, option4 | правильна_відповідь | Пояснення до тесту (необов'язково)</code>\n\n` +
    `📌 <b>Поля через роздільник ( | ):</b>\n` +
    `1️⃣ Рівень (A1-C2)\n` +
    `2️⃣ Англійське слово\n` +
    `3️⃣ Український переклад\n` +
    `4️⃣ Вимова/Транскрипція українськими літерами\n` +
    `5️⃣ Запитання тесту (з ___ або без)\n` +
    `6️⃣ 4 варіанти відповідей через кому\n` +
    `7️⃣ Точний текст правильної відповіді\n` +
    `8️⃣ Пояснення правила (опціонально)\n\n` +
    `💡 <i>Якщо тест до слова не потрібен, надішли лише перші 4 поля:</i>\n` +
    `<code>word: A2 | Challenge | Виклик | Челендж</code>\n\n` +
    `📎 Можна надсилати багато слів одночасно — кожне слово з нового рядка!`,
    { parse_mode: 'HTML' }
  );
};

export const handleAddTestPrompt = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.reply(
    `🎯 <b>Шаблон для додавання цікавих міні-тестів (з пропусками):</b>\n\n` +
    `<code>test: B1 | I always start my morning with a cup of hot ___. | school, coffee, window, bread | coffee | Morning coffee — класичний ранішній ритуал.</code>\n\n` +
    `📌 <b>Поля через роздільник ( | ):</b>\n` +
    `1️⃣ Рівень (A1-C2)\n` +
    `2️⃣ Цікаве речення з пропуском <code>___</code>\n` +
    `3️⃣ 4 логічні варіанти відповідей через кому\n` +
    `4️⃣ Точний текст правильної відповіді (слово, яке вставляється в пропуск)\n` +
    `5️⃣ Корисне пояснення: чому саме це слово підходить + переклад (опціонально)\n\n` +
    `📎 Надсилай тести пакетом (кожен тест з нового рядка). Префікс <code>test:</code> обов'язковий!`,
    { parse_mode: 'HTML' }
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

      // Списки для красивого фінального звіту
      const successLogs: string[] = [];
      const errors: string[] = [];

      // Чітко визначаємо допустимі рівні для приведення типів
      const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      for (const line of lines) {
        try {
          const parts = line.replace('word:', '').trim().split('|').map((s) => s.trim());

          if (parts.length < 4) {
            errors.push(`⚠️ Мало полів у рядку: <code>${line.substring(0, 30)}...</code>`);
            continue;
          }

          const [inputLevel, english, ukrainian, transcription, question, rawOptions, correctAnswerText, explanation] = parts;

          // Перевірка рівня
          if (!validLevels.includes(inputLevel)) {
            errors.push(`⚠️ Невідомий рівень <b>${inputLevel}</b> у слові: <code>${english}</code>`);
            continue;
          }

          // 🌟 Створюємо слово, явно привівши тип рівня за допомогою "as"
          const newWord = await Word.create({
            level: inputLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
            english,
            ukrainian,
            transcription,
          });
          wordsAdded++;

          let testLogStatus = '';
          // Якщо передані обов'язкові поля для створення тесту
          if (question && rawOptions && correctAnswerText) {
            const options = rawOptions.split(',').map((s) => s.trim());

            if (options.length < 2) {
              errors.push(`⚠️ Слово <b>${english}</b> додано, але в тесті менше 2 варіантів.`);
            } else {
              const correctOptionIndex = options.indexOf(correctAnswerText);

              if (correctOptionIndex === -1) {
                errors.push(`⚠️ Слово <b>${english}</b> додано, але правильна відповідь (<code>${correctAnswerText}</code>) не знайдена серед варіантів.`);
              } else {
                // 🌟 Створюємо тест, також привівши тип рівня
                await TestQuestion.create({
                  level: inputLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
                  question,
                  options,
                  correctOptionIndex,
                  wordId: newWord._id, // 🔗 Тепер TypeScript бачить _id без помилок!
                  explanation: explanation ? explanation : undefined
                });
                testsAdded++;
                testLogStatus = ' (+🎯 тест)';
              }
            }
          }

          successLogs.push(`🔹 [${inputLevel}] <b>${english}</b> — ${ukrainian}${testLogStatus}`);

        } catch (err) {
          console.error('Помилка додавання рядка:', err);
          errors.push(`❌ Помилка сервера при обробці: <code>${line.substring(0, 20)}...</code>`);
        }
      }

      // Формуємо красивий фінальный звіт через безпечний HTML
      let finalMessage = `🚀 <b>Масове завантаження завершено!</b>\n\n`;
      finalMessage += `📊 <b>Підсумки:</b>\n`;
      finalMessage += `🟢 Додано слів: <b>${wordsAdded}</b>\n`;
      finalMessage += `🎯 Додано тестів: <b>${testsAdded}</b>\n\n`;

      if (successLogs.length > 0) {
        finalMessage += `✅ <b>Успішно завантажено:</b>\n${successLogs.join('\n')}\n\n`;
      }

      if (errors.length > 0) {
        finalMessage += `⚠️ <b>Помилки та попередження:</b>\n${errors.join('\n')}`;
      }

      return ctx.reply(finalMessage, { parse_mode: 'HTML' });

    } catch (error) {
      console.error('Помилка масового додавання:', error);
      return ctx.reply('❌ Сталася критична помилка в системі масового збереження матеріалів.', { parse_mode: 'HTML' });
    }
  }

  // ── 2. ТЕСТ (загальний, без прив'язки до слова) ───────────────────────────
  if (textData.includes('test:')) {
    try {
      // Розбиваємо весь текст на рядки і беремо тільки ті, що починаються на 'test:'
      const lines = textData.split('\n').filter(line => line.trim().startsWith('test:'));

      if (lines.length === 0) return; // Якщо тестів немає, йдемо далі

      let addedCount = 0;
      const successLogs: string[] = [];
      const errors: string[] = [];

      // Допустимі рівні для типізації
      const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      for (const line of lines) {
        try {
          const parts = line.replace('test:', '').trim().split('|').map((s) => s.trim());

          // Перевіряємо чи є хоча б 4 поля
          if (parts.length < 4) {
            errors.push(`❌ Мало полів у рядку: <code>${line.substring(0, 30)}...</code>`);
            continue;
          }

          const [inputLevel, question, rawOptions, correctAnswerText, explanation] = parts;

          // Перевірка та приведення рівня
          if (!validLevels.includes(inputLevel)) {
            errors.push(`❌ Невідомий рівень (<b>${inputLevel}</b>) для: <code>${question.substring(0, 20)}...</code>`);
            continue;
          }

          const options = rawOptions.split(',').map((s) => s.trim());
          if (options.length < 2) {
            errors.push(`❌ Мало варіантів (мінімум 2) для: <code>${question.substring(0, 20)}...</code>`);
            continue;
          }

          const correctOptionIndex = options.indexOf(correctAnswerText);
          if (correctOptionIndex === -1) {
            errors.push(`❌ Відповідь '<b>${correctAnswerText}</b>' не знайдена серед варіантів: <code>${question.substring(0, 20)}...</code>`);
            continue;
          }

          // 🌟 Створюємо тест, явно привівши тип рівня за допомогою "as"
          await TestQuestion.create({
            level: inputLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
            question,
            options,
            correctOptionIndex,
            explanation: explanation && explanation.trim() !== '' ? explanation.trim() : undefined
          });

          addedCount++;
          successLogs.push(`🎯 [${inputLevel}] <code>${question.substring(0, 30)}${question.length > 30 ? '...' : ''}</code>`);

        } catch (err) {
          console.error('Помилка обробки рядка тесту:', err);
          errors.push(`❌ Внутрішня помилка обробки рядка: <code>${line.substring(0, 20)}...</code>`);
        }
      }

      // Формуємо красивий фінальний звіт у HTML
      let replyText = `🚀 <b>Масове додавання тестів завершено!</b>\n\n`;
      replyText += `📊 <b>Підсумки:</b>\n`;
      replyText += `🟢 Додано самостійних тестів: <b>${addedCount}</b>\n\n`;

      if (successLogs.length > 0) {
        replyText += `✅ <b>Успішно додані тести:</b>\n${successLogs.join('\n')}\n\n`;
      }

      if (errors.length > 0) {
        replyText += `⚠️ <b>Помилки:</b>\n${errors.join('\n')}`;
      }

      return ctx.reply(replyText, { parse_mode: 'HTML' });

    } catch (error) {
      console.error('Критична помилка додавання тестів:', error);
      return ctx.reply('❌ <b>Критична помилка при збереженні тестів на сервері.</b>', { parse_mode: 'HTML' });
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
        const [words, tests, linkedTests] = await Promise.all([
          Word.countDocuments({ level: lvl }),
          TestQuestion.countDocuments({ level: lvl }),
          TestQuestion.countDocuments({ level: lvl, wordId: { $ne: null } }),
        ]);
        return { lvl, words, tests, linkedTests };
      }),
    );

    let message = `📊 *ДЕТАЛЬНА СТАТИСТИКА БАЗИ ДАНИХ*\n\n`;
    message += `👥 Усього користувачів: *${totalUsers}*\n`;
    message += `💎 З них з Premium: *${premiumUsers}*\n\n`;
    message += `🗂 *Наповнення контентом за рівнями:*\n`;

    for (const { lvl, words, tests, linkedTests } of levelStats) {
      message += `\n📈 *Рівень ${lvl}:*\n`;
      message += `  ▫️ Слова/Фрази: *${words}*\n`;
      message += `  ▫️ Міні-тести (всього): *${tests}* _(прив'язані до слів: ${linkedTests})_\n`;
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
  // Хелпер — надсилає одне повідомлення з retry при 429
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
  // --- ОБРОБКА РОЗСИЛКИ ---
  if (state === 'waiting_for_broadcast') {
    adminState.delete(adminId);
    await ctx.reply('⏳ Починаю розсилку...');

    try {
      const users = await User.find({}).select('telegramId').lean();
      let successCount = 0;
      let failCount = 0;

      for (const user of users) {
        const result = await sendWithRetry(() => ctx.copyMessage(user.telegramId));
        result === 'ok' ? successCount++ : failCount++;
        await new Promise(res => setTimeout(res, 50));
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