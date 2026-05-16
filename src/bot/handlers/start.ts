import { CommandContext, Context } from 'grammy';
import { User } from '../../models/User';
import { levelKeyboard } from '../keyboards/level'; 

export const handleStart = async (ctx: CommandContext<Context>) => {
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'Студент';

  if (!telegramId) return;

  try {
    // Шукаємо користувача в БД
    let user = await User.findOne({ telegramId });

    if (!user) {
      // Якщо новий користувач — створюємо запис
      user = new User({ telegramId, firstName });
      await user.save();

      await ctx.reply(`Привіт, ${firstName}! 👋\nЯ SnackEnglish — твій помічник для щоденного вивчення англійської.\n\nДавай почнемо! Обери свій поточний рівень:`, {
        reply_markup: levelKeyboard,
      });
    } else if (!user.level) {
      // Якщо користувач є, але рівень ще не обрав
      await ctx.reply('Ти ще не обрав свій рівень. Будь ласка, зроби це зараз:', {
        reply_markup: levelKeyboard,
      });
    } else {
      // Якщо користувач вже зареєстрований і має рівень
      await ctx.reply(`З поверненням, ${firstName}! Твій рівень: ${user.level}. Готовий до нових слів? 🍪`);
    }
  } catch (error) {
    console.error('Помилка при реєстрації:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй пізніше.');
  }
};