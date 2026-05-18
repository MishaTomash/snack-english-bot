import { Context } from 'grammy';
import { config } from '../../config';
import { createAdminMenu } from '../keyboards/admin';
import { createMainMenu } from '../keyboards/main';
import { Word } from '../../models/Word';

export const handleAdminCommand = async (ctx: Context) => {
    const userId = ctx.from?.id;

    // Перевірка на права адміністратора
    if (userId !== config.ADMIN_ID) {
        return; 
    }

    await ctx.reply('👨‍💻 *Ласкаво просимо до Адмін-панелі!*\n\nОберіть дію на клавіатурі знизу.', {
        parse_mode: 'Markdown',
        reply_markup: createAdminMenu()
    });
};

export const handleExitAdmin = async (ctx: Context) => {
    await ctx.reply('🚪 Ви вийшли з режиму адміністратора.', {
        reply_markup: createMainMenu()
    });
};

export const handleAddWordPrompt = async (ctx: Context) => {
    if (ctx.from?.id !== config.ADMIN_ID) return;

    const instruction = `📝 *Шаблон для додавання слова:*\n\n` +
                        `Скопіюйте текст нижче, замініть дані на свої та надішліть боту:\n\n` +
                        `\`word: A2 | Challenge | Виклик | Челендж\``;

    await ctx.reply(instruction, { parse_mode: 'Markdown' });
};

// Обробник тексту, який розбирає шаблон і зберігає слово в БД
export const handleAdminTextInbound = async (ctx: Context, next: () => Promise<void>) => {
    if (ctx.from?.id !== config.ADMIN_ID) {
        return await next(); // Якщо це не адмін, пропускаємо далі
    }
    
    const text = ctx.message?.text;
    
    // КРИТИЧНО: Якщо текст не стосується додавання слів, віддаємо команду наступним хендлерам (bot.hears)
    if (!text || !text.startsWith('word:')) {
        return await next();
    }

    try {
        // Прибираємо префікс "word:" і ділимо рядок по "|"
        const rawData = text.replace('word:', '').trim();
        const parts = rawData.split('|').map(item => item.trim());

        // Перевіряємо, чи масив має рівно 4 елементи (level, english, ukrainian, transcription)
        if (parts.length < 4) {
            return ctx.reply('❌ *Помилка:* Не всі поля заповнено за шаблоном. Перевірте наявність усіх трьох розділювачів `|`.', { parse_mode: 'Markdown' });
        }

        const inputLevel = parts[0];
        const english = parts[1];
        const ukrainian = parts[2];
        const transcription = parts[3];

        // Додаткова перевірка на пусті рядки
        if (!inputLevel || !english || !ukrainian || !transcription) {
            return ctx.reply('❌ *Помилка:* Одне або кілька полів пусті.', { parse_mode: 'Markdown' });
        }

        // Перевіряємо, чи введений рівень відповідає дозволеним у системі
        const allowedLevels = ['A1', 'A2', 'B1', 'B2'];
        if (!allowedLevels.includes(inputLevel)) {
            return ctx.reply(`❌ *Помилка:* Рівень *${inputLevel}* не підтримується. Оберіть з: A1, A2, B1, B2.`, { parse_mode: 'Markdown' });
        }

        // Явно приводимо тип до потрібного літералу
        const level = inputLevel as 'A1' | 'A2' | 'B1' | 'B2';

        // Зберігаємо в MongoDB з назвами полів, які очікує твоя схема Word
        await Word.create({
            level,
            english,       
            ukrainian,     
            transcription
        });

        await ctx.reply(`✅ *Успішно додано!*\n\n📊 Рівень: *${level}*\n🇬🇧 Слово: *${english}*\n🇺🇦 Переклад: *${ukrainian}*\n🔤 Транскрипція: *${transcription}*`, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Помилка адмінки:', error);
        await ctx.reply('❌ Відбулася помилка при збереженні слова в базу даних.');
    }
};