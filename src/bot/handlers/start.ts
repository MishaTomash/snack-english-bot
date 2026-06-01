import { CommandContext, Context } from 'grammy';
import { GrammyError } from 'grammy';
import { User } from '../../models/User';
import { levelKeyboard } from '../keyboards/level';
import { createMainMenu } from '../keyboards/main';

export const handleStart = async (ctx: CommandContext<Context>) => {
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'Студент';
  const username = ctx.from?.username;

  const payload = ctx.match;

  if (!telegramId) return;

  try {
    let user = await User.findOne({ telegramId });

    if (!user) {
      let referredBy: number | undefined;
      if (payload && typeof payload === 'string' && payload.startsWith('ref_')) {
        const inviterId = parseInt(payload.replace('ref_', ''), 10);
        if (!isNaN(inviterId) && inviterId !== telegramId) {
          referredBy = inviterId;
        }
      }

      user = new User({
        telegramId,
        firstName,
        username,
        referredBy,
      });
      await user.save();

      await ctx.reply(
        `Привіт, ${firstName}! 👋\n🌟 SnackEnglish допоможе тобі вивчати англійську легко та щодня.\n\nДавай почнемо! Обери свій поточний рівень:`,
        { reply_markup: levelKeyboard }
      );
    } else {
      user.username = username;
      await user.save();

      if (!user.level) {
        await ctx.reply('Ти ще не обрав свій рівень. Будь ласка, зроби це зараз:', {
          reply_markup: levelKeyboard,
        });
      } else {
        await ctx.reply(`З поверненням, ${firstName}! Твій рівень: ${user.level}. Готовий до нових слів? 🍪`, {
          reply_markup: createMainMenu(),
        });
      }
    }
  } catch (error) {
    if (error instanceof GrammyError && error.error_code === 403) {
      console.warn(`⚠️ Бот не зміг надіслати повідомлення, бо користувач (ID: ${telegramId}) заблокував його.`);
      return; // 👈 Мовчки виходимо — це не баг
    }

    console.error('Помилка при реєстрації:', error);

    // Спроба надіслати повідомлення про помилку — теж може бути заблокована
    try {
      await ctx.reply('Вибач, сталася помилка. Спробуй пізніше.');
    } catch (replyError) {
      if (replyError instanceof GrammyError && replyError.error_code === 403) {
        console.warn(`⚠️ Користувач (ID: ${telegramId}) заблокував бота — навіть повідомлення про помилку не надіслати.`);
      } else {
        throw replyError;
      }
    }
  }
};