import { Context } from 'grammy';
import { config } from '../../config';
import { createAdminMenu } from '../keyboards/admin';
import { createMainMenu } from '../keyboards/main';
import { Word } from '../../models/Word';
import { TestQuestion } from '../../models/TestQuestion';
import { Text } from '../../models/Text'; // Імпортуємо твою точну модель тексту
import { User } from '../../models/User';

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
                        `\`word: A2 | Challenge | Виклик | Челендж\``;

    await ctx.reply(instruction, { parse_mode: 'Markdown' });
};

// Інструкція для кнопки "Додати тест"
export const handleAddTestPrompt = async (ctx: Context) => {
    if (ctx.from?.id !== config.ADMIN_ID) return;

    const instruction = `🎯 *Шаблон для додавання міні-тесту:*\n\n` +
                        `\`test: A1 | Як буде "вода"? | school, water, window, bread | water\``;

    await ctx.reply(instruction, { parse_mode: 'Markdown' });
};

// Інструкція для кнопки "Додати text"
export const handleAddTextPrompt = async (ctx: Context) => {
    if (ctx.from?.id !== config.ADMIN_ID) return;

    const instruction = `📖 *Шаблон для додавання тексту для перекладу:*\n\n` +
                        `Скопіюйте текст нижче, замініть дані на свої та надішліть боту:\n\n` +
                        `\`text: A2 | I love coding in TypeScript. | Я люблю програмувати на TypeScript.\``;

    await ctx.reply(instruction, { parse_mode: 'Markdown' });
};

// Головний обробник тексту адмінки (слова + тести + тексти)
export const handleAdminTextInbound = async (ctx: Context, next: () => Promise<void>) => {
    if (ctx.from?.id !== config.ADMIN_ID) {
        return await next();
    }
    
    const textData = ctx.message?.text;
    if (!textData) return await next();

    // 1. ОБРОБКА ДОДАВАННЯ СЛОВА
    if (textData.startsWith('word:')) {
        try {
            const rawData = textData.replace('word:', '').trim();
            const parts = rawData.split('|').map(item => item.trim());

            if (parts.length < 4) {
                return ctx.reply('❌ *Помилка:* Не всі поля заповнено. Потрібно 4 блоки розділені через `|`.', { parse_mode: 'Markdown' });
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
    if (textData.startsWith('test:')) {
        try {
            const rawData = textData.replace('test:', '').trim();
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

            const options = rawOptions.split(',').map(item => item.trim());
            if (options.length < 2) {
                return ctx.reply('❌ *Помилка:* Тест повинен мати хоча б 2 варіанти відповідей.', { parse_mode: 'Markdown' });
            }

            const correctOptionIndex = options.indexOf(correctAnswerText);
            if (correctOptionIndex === -1) {
                // Виправлено: Прибрали некоректний parse_markup
                return ctx.reply(`❌ *Помилка:* Правильна відповідь \`${correctAnswerText}\` не знайдена серед варіантів.`, { parse_mode: 'Markdown' });
            }

            const allowedLevels = ['A1', 'A2', 'B1', 'B2'];
            if (!allowedLevels.includes(inputLevel)) {
                return ctx.reply(`❌ *Помилка:* Рівень *${inputLevel}* не підтримується.`, { parse_mode: 'Markdown' });
            }

            await TestQuestion.create({
                level: inputLevel as 'A1' | 'A2' | 'B1' | 'B2',
                question,
                options,
                correctOptionIndex
            });

            return ctx.reply(`✅ *Міні-тест успішно додано!*`, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error(error);
            return ctx.reply('❌ Помилка при збереженні тесту.');
        }
    }

    // 3. ОБРОБКА ДОДАВАННЯ ТЕКСТУ
    if (textData.startsWith('text:')) {
        try {
            const rawData = textData.replace('text:', '').trim();
            const parts = rawData.split('|').map(item => item.trim());

            if (parts.length < 3) {
                return ctx.reply('❌ *Помилка:* Не всі поля заповнено. Потрібно 3 блоки розділені через `|` (рівень | англійська | переклад).', { parse_mode: 'Markdown' });
            }

            const inputLevel = parts[0];
            const english = parts[1];
            const ukrainian = parts[2];

            if (!inputLevel || !english || !ukrainian) {
                return ctx.reply('❌ *Помилка:* Ви пропустили якесь із полів.', { parse_mode: 'Markdown' });
            }

            const allowedLevels = ['A1', 'A2', 'B1', 'B2'];
            if (!allowedLevels.includes(inputLevel)) {
                return ctx.reply(`❌ *Помилка:* Рівень *${inputLevel}* не підтримується.`, { parse_mode: 'Markdown' });
            }

            // Зберігаємо в базу даних згідно з точними назвами властивостей твоєї моделі Text
            await Text.create({
                level: inputLevel as 'A1' | 'A2' | 'B1' | 'B2',
                englishText: english,               // Змінено на englishText
                ukrainianTranslation: ukrainian     // Змінено на ukrainianTranslation
            });

            return ctx.reply(`✅ *Текст успішно додано!*\n\n📊 Рівень: *${inputLevel}*\n🇬🇧 Англійська: _${english}_\n🇺🇦 Переклад: _${ukrainian}_`, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Помилка додавання тексту:', error);
            return ctx.reply('❌ Відбулася помилка при збереженні тексту в базу даних.');
        }
    }

    return await next();
};
export const handleAdminStats = async (ctx: Context) => {
    if (ctx.from?.id !== config.ADMIN_ID) return;

    try {
        // Рахуємо користувачів у базі даних (тепер використовуємо просто User)
        const totalUsers = await User.countDocuments();
        const premiumUsers = await User.countDocuments({ isPremium: true });

        const levels = ['A1', 'A2', 'B1', 'B2'] as const;

        let statsMessage = `📊 *ДЕТАЛЬНА СТАТИСТИКА БАЗИ ДАНИХ*\n\n`;
        statsMessage += `👥 Усього користувачів: *${totalUsers}*\n`;
        statsMessage += `💎 З них з Premium: *${premiumUsers}*\n\n`;
        statsMessage += `🗂 *Наповнення контентом за рівнями:*\n`;

        // Збираємо статистику по базі даних
        for (const lvl of levels) {
            const wordsCount = await Word.countDocuments({ level: lvl });
            const testsCount = await TestQuestion.countDocuments({ level: lvl });
            const textsCount = await Text.countDocuments({ level: lvl });

            statsMessage += `\n📈 *Рівень ${lvl}:*\n`;
            statsMessage += `  ▫️ Слова/Фрази: *${wordsCount}*\n`;
            statsMessage += `  ▫️ Міні-тести: *${testsCount}*\n`;
            statsMessage += `  ▫️ Тексти для перекладу: *${textsCount}*\n`;
        }

        await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Помилка збору адмін-статистики:', error);
        await ctx.reply('❌ Не вдалося завантажити статистику бази даних.');
    }
};