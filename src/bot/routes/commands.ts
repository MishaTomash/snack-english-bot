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

  bot.command('cleargeneral', async (ctx) => {
    try {
      const result = await TestQuestion.deleteMany({ wordId: null });
      await ctx.reply(`✅ Видалено ${result.deletedCount} некоректних тестів.`);
    } catch {
      await ctx.reply('❌ Помилка при видаленні.');
    }
  });
};