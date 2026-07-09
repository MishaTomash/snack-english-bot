import { Bot } from 'grammy';
import { TestQuestion } from '../../models/TestQuestion';
import { checkWordLimits } from '../middlewares/limits';

import { handleStart } from '../handlers/start';
import { handleWords } from '../handlers/words';
import { sendRandomTest } from '../handlers/tests';
import { showProfile } from '../handlers/profile';
import { handleAdminCommand, handleReferralBroadcastStart } from '../handlers/admin'; // 👈 додано handleReferralBroadcastStart
import { handleCoursesList } from '../handlers/courses';
import { createNewTopicCommand } from '../handlers/adminTopics';
import { handleTopMenu } from '../handlers/rating';
import { createLearningMenu } from '../keyboards/main';

export const registerCommands = (bot: Bot) => {
    bot.command('start', handleStart);
    bot.command('words', checkWordLimits, handleWords);
    bot.command('test', sendRandomTest);
    bot.command('profile', showProfile);
    bot.command('stats', showProfile);
    bot.command('admin', handleAdminCommand);
    bot.command('courses', handleCoursesList);
    bot.command('new_topic', createNewTopicCommand);
    bot.command('top', handleTopMenu);
    bot.command('broadcast_ref', handleReferralBroadcastStart); // 👈 нова команда для адміна


    // 🆘 Команда HELP (Красиве форматування списку команд)
    bot.command('help', async (ctx) => {
        const helpText =
            `❓ <b>Довідковий центр SnackEnglish</b>\n\n` +
            `Ось список команд, які допоможуть тобі в навчанні:\n\n` +
            `🚀 <b>Основні:</b>\n` +
            `▫️ /start — 🏠 Головне меню та перезапуск\n` +
            `▫️ /learn — 📚 Відкрити меню навчання\n` +
            `▫️ /profile — 👤 Твій профіль та статистика\n` +
            `▫️ /top — 🏆 Рейтинг найактивніших учнів\n\n` +
            `⚡️ <b>Швидкий доступ:</b>\n` +
            `▫️ /words — 📖 Вчити нові слова\n` +
            `▫️ /test — 🎯 Пройти швидкий міні-тест\n` +
            `▫️ /courses — 🎓 Доступні курси\n\n` +
            `💬 <b>Залишилися питання або знайшов баг?</b>\n` +
            `Пиши розробнику → @misha_help_ua`;

        await ctx.reply(helpText, { parse_mode: 'HTML' });
    });

    // 🎓 Команда LEARN (Виклик Inline-меню навчання)
    bot.command('learn', async (ctx) => {
        await ctx.reply(
            `🎓 <b>Розділ навчання</b>\n\n` +
            `Що будемо практикувати сьогодні? Обирай потрібний режим нижче: 👇`,
            {
                parse_mode: 'HTML',
                reply_markup: createLearningMenu(),
            }
        );
    });

    // 🧹 Команда CLEARGENERAL (Очищення бази від пустих тестів з гарним виводом)
    bot.command('cleargeneral', async (ctx) => {
        try {
            const result = await TestQuestion.deleteMany({ wordId: null });
            await ctx.reply(
                `✅ <b>Очищення бази успішне!</b>\n\n` +
                `🗑 Видалено некоректних тестів: <b>${result.deletedCount}</b> шт.`,
                { parse_mode: 'HTML' }
            );
        } catch (error) {
            console.error('Помилка при очищенні бази:', error);
            await ctx.reply(
                `❌ <b>Помилка!</b>\nНе вдалося виконати очищення бази даних. Перевір логи сервера.`,
                { parse_mode: 'HTML' }
            );
        }
    });
};