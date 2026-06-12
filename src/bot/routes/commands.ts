import { Bot } from 'grammy';
import { TestQuestion } from '../../models/TestQuestion';
import { checkWordLimits } from '../middlewares/limits';

import { handleStart } from '../handlers/start';
import { handleWords } from '../handlers/words';
import { sendRandomText } from '../handlers/texts';
import { sendRandomTest } from '../handlers/tests';
import { showProfile } from '../handlers/profile';
import { handleAdminCommand } from '../handlers/admin';
import { handleCoursesList } from '../handlers/courses';
import { createNewTopicCommand } from '../handlers/adminTopics';
import { handleTopMenu } from '../handlers/rating'; // ← додай імпорт

export const registerCommands = (bot: Bot) => {
    bot.command('start', handleStart);
    bot.command('words', checkWordLimits, handleWords);
    bot.command('text', sendRandomText);
    bot.command('test', sendRandomTest);
    bot.command('profile', showProfile);
    bot.command('stats', showProfile);
    bot.command('admin', handleAdminCommand);
    bot.command('courses', handleCoursesList);
    bot.command('new_topic', createNewTopicCommand);

    // ← нові команди
    bot.command('top', handleTopMenu);

    bot.command('help', async (ctx) => {
        await ctx.reply(
            `❓ <b>Допомога SnackEnglish</b>\n\n` +
            `<b>Команди:</b>\n` +
            `/start — головне меню\n` +
            `/profile — твій профіль\n` +
            `/top — рейтинг тижня\n` +
            `/help — ця сторінка\n\n` +
            `<b>Питання або проблема?</b>\n` +
            `Пиши сюди → @misha_help_ua`, // ← заміни на свій
            { parse_mode: 'HTML' }
        );
    });

    bot.command('cleargeneral', async (ctx) => {
        try {
            const result = await TestQuestion.deleteMany({ wordId: null });
            await ctx.reply(`✅ Видалено ${result.deletedCount} некоректних тестів.`);
        } catch {
            await ctx.reply('❌ Помилка при видаленні.');
        }
    });
};