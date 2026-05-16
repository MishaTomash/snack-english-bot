import { Context } from 'grammy';
import { User } from '../../models/User';

export const handleLevelSelection = async (ctx: Context) => {
  const callbackData = ctx.callbackQuery?.data;
  const telegramId = ctx.from?.id;

  if (!callbackData || !telegramId) return;

  // Отримуємо сам рівень (наприклад, 'A1' з 'level_A1')
  const level = callbackData.split('_')[1]; 

  try {
    await User.findOneAndUpdate({ telegramId }, { level });

    // Оновлюємо текст повідомлення, видаляючи кнопки
    await ctx.editMessageText(`✅ Супер! Твій рівень встановлено: **${level}**.\n\nТепер я буду підбирати матеріали спеціально для тебе!`);
    await ctx.answerCallbackQuery(); // Обов'язкова відповідь Telegram, щоб кнопка перестала "вантажитись"
  } catch (error) {
    console.error('Помилка при оновленні рівня:', error);
    await ctx.answerCallbackQuery('Сталася помилка при збереженні рівня.');
  }
};