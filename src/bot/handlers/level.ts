import { Context } from 'grammy';
import { User } from '../../models/User';
import { createMainMenu } from '../keyboards/main';

export const handleLevelSelection = async (ctx: Context) => {
  const callbackData = ctx.callbackQuery?.data;
  const telegramId = ctx.from?.id;
  if (!callbackData || !telegramId) return;

  // ✅ Відповідаємо на callback одразу — до будь-яких БД запитів
  await ctx.answerCallbackQuery().catch(() => {});

  const level = callbackData.split('_')[1];

  await User.findOneAndUpdate(
    { telegramId },
    { level },
    { returnDocument: 'after' }, // ✅ нова опція замість deprecated { new: true }
  );

  // ✅ **text** — це MDv2, в legacy Markdown жирний це *text*
  // ✅ .catch() — якщо користувач натиснув той самий рівень вдруге, не крашимось
  await ctx
    .editMessageText(
      `✅ Супер\\! Твій рівень встановлено: *${level}*\\.\n\nТепер я буду підбирати матеріали спеціально для тебе\\!`,
      { parse_mode: 'MarkdownV2' },
    )
    .catch((err: any) => {
      if (!err?.description?.includes('message is not modified')) {
        console.error('Помилка editMessageText при виборі рівня:', err);
      }
      // Якщо повідомлення не змінилось — мовчки ігноруємо
    });

  await ctx.reply('Обери, з чого почнемо сьогодні? 👇', {
    reply_markup: createMainMenu(),
  });
};