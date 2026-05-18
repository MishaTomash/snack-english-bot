import { Context } from 'grammy';
import { config } from '../../config';
import { createAdminMenu } from '../keyboards/admin';
import { createMainMenu } from '../keyboards/main';
import { Word } from '../../models/Word';
import { TestQuestion } from '../../models/TestQuestion'; // Імпортуємо твою точну модель

// Інструкція для команди /admin
export const handleAdminCommand = async (ctx: Context) => {
    const userId = ctx.from?.id;

    if (userId !== config.ADMIN_ID) {
        return; 
    }

    await ctx.reply('👨‍💻 *Ласкаво просимо до Адмін-панелі!*\n\nОберіть дію на клавіатурі знизу.', {
        parse_mode: 'Markdown',
        reply_markup: createAdminMenu()
    });
};

// Вихід з адмінки
export const handleExitAdmin = async (ctx: Context) => {
    await ctx.reply('🚪 Ви вийшли з режиму адміністратора.', {
        reply_markup: createMainMenu()
    });
};

// Інструкція для кнопки "Додати слово"
export const handleAddWordPrompt = async (ctx: Context) => {
    if (ctx.from?.id !== config.ADMIN_ID) return;

    const instruction = `📝 *Шаблон для додавання слова:*\n\n` +
                        `Скопіюйте текст нижче, замініть дані на свої та надішліть боту:\n\n` +
                        `\`word: A2 | Challenge | Виклик | Челендж\``;

    await ctx.reply(instruction, { parse_mode: 'Markdown' });
};

// Інструкція для кнопки "Додати тест"
export const handleAddTestPrompt = async (ctx: Context) => {
    if (ctx.from?.id !== config.ADMIN_ID) return;

    const instruction = `🎯 *Шаблон для додавання міні-тесту:*\n\n` +
                        `Скопіюйте текст нижче, замініть дані на свої та надішліть боту:\n\n` +
                        `\`test: A1 | Як буде "вода"? | school, water, window, bread | water\``;

    await ctx.reply(instruction, { parse_mode: 'Markdown' });
};

// Головний обробник тексту адмінки (слова + тестики)
export const handleAdminTextInbound = async (ctx: Context, next: () => Promise<void>) => {
    if (ctx.from?.id !== config.ADMIN_ID) {
        return await next();
    }
    
    const text = ctx.message?.text;
    if (!text) return await next();

    // 1. ОБРОБКА ДОДАВАННЯ СЛОВА
    if (text.startsWith('word:')) {
        try {
            const rawData = text.replace('word:', '').trim();
            const parts = rawData.split('|').map(item => item.trim());

            if (parts.length < 4) {
                return ctx.reply('❌ *Помилка:* Не всі поля заповнено. Перевірте наявність усіх трьох розділювачів `|`.', { parse_mode: 'Markdown' });
            }

            const inputLevel = parts[0];
            const english = parts[1];
            const ukrainian = parts[2];
            const transcription = parts[3];

            if (!inputLevel || !english || !ukrainian || !transcription) {
                return ctx.reply('❌ *Помилка:* Одне або кілька полів пусті.', { parse_mode: 'Markdown' });
            }

            const allowedLevels = ['A1', 'A2', 'B1', 'B2'];
            if (!allowedLevels.includes(inputLevel)) {
                return ctx.reply(`❌ *Помилка:* Рівень *${inputLevel}* не підтримується.`, { parse_mode: 'Markdown' });
            }

            await Word.create({
                level: inputLevel as 'A1' | 'A2' | 'B1' | 'B2',
                english,       
                ukrainian,     
                transcription
            });

            return ctx.reply(`✅ *Слово успішно додано!*`, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error(error);
            return ctx.reply('❌ Помилка при збереженні слова.');
        }
    }

    // 2. ОБРОБКА ДОДАВАННЯ ТЕСТУ
    if (text.startsWith('test:')) {
        try {
            const rawData = text.replace('test:', '').trim();
            const parts = rawData.split('|').map(item => item.trim());

            if (parts.length < 4) {
                return ctx.reply('❌ *Помилка:* Не всі поля заповнено. Потрібно 4 блоки розділені через `|`.', { parse_mode: 'Markdown' });
            }

            const inputLevel = parts[0];
            const question = parts[1];
            const rawOptions = parts[2];
            const correctAnswerText = parts[3];

            if (!inputLevel || !question || !rawOptions || !correctAnswerText) {
                return ctx.reply('❌ *Помилка:* Ви пропустили якесь із полів.', { parse_mode: 'Markdown' });
            }

            // Розбиваємо варіанти відповідей через кому
            const options = rawOptions.split(',').map(item => item.trim());
            if (options.length < 2) {
                return ctx.reply('❌ *Помилка:* Тест повинен мати хоча б 2 варіанти відповідей через кому.', { parse_mode: 'Markdown' });
            }

            // Знаходимо індекс правильної відповіді в масиві варіантів
            const correctOptionIndex = options.indexOf(correctAnswerText);

            // Якщо такого слова немає серед варіантів — indexOf поверне -1
            if (correctOptionIndex === -1) {
                return ctx.reply(`❌ *Помилка:* Правильна відповідь \`${correctAnswerText}\` не знайдена серед варіантів рядка: \`${rawOptions}\``, { parse_mode: 'Markdown' });
            }

            const allowedLevels = ['A1', 'A2', 'B1', 'B2'];
            if (!allowedLevels.includes(inputLevel)) {
                return ctx.reply(`❌ *Помилка:* Рівень *${inputLevel}* не підтримується.`, { parse_mode: 'Markdown' });
            }

            // Зберігаємо в MongoDB згідно з твоєю точною схемою TestQuestion
            await TestQuestion.create({
                level: inputLevel as 'A1' | 'A2' | 'B1' | 'B2',
                question,
                options,
                correctOptionIndex
            });

            return ctx.reply(`✅ *Міні-тест успішно додано!*\n\n📊 Рівень: *${inputLevel}*\n❓ Питання: *${question}*\n🔢 Індекс правильної відповіді: *${correctOptionIndex}*`, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Помилка додавання тесту:', error);
            return ctx.reply('❌ Відбулася помилка при збереженні тесту.');
        }
    }

    // Якщо текст не адмінський — передаємо далі звичайним кнопкам
    return await next();
};