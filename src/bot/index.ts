import { Bot } from 'grammy';
import { config } from '../config';


export const bot = new Bot(config.BOT_TOKEN);


bot.command('start', async (ctx) => {
  await ctx.reply('🍪 Привіт! Я SnackEnglish. Бот успішно запущено і я готовий до роботи!');
});