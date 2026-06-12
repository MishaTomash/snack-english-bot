import { Bot } from 'grammy';

export const registerErrorHandler = (bot: Bot) => {
  bot.catch((err) => {
    const ctx = err.ctx;
    const e = err.error;
    if (e instanceof Error && (
      e.message.includes('bot was blocked') ||
      e.message.includes('user is deactivated')
    )) return;
    console.error(`❌ Помилка під час обробки апдейту ${ctx.update.update_id}:\nВнутрішня помилка додатку:`, e);
  });
};