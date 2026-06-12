import { Bot } from 'grammy';

export const registerLoggers = (bot: Bot) => {
  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data;
    const user = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] 📥 [Inline]: [${data}] від: ${user}`);
    await next();
  });

  bot.on('message:text', async (ctx, next) => {
    const user = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] 💬 [Текст]: [${ctx.message.text}] від: ${user}`);
    await next();
  });
};