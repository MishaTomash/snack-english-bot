import { CommandContext, Context } from 'grammy';
import { User } from '../../models/User';
import { levelKeyboard } from '../keyboards/level';
import { createMainMenu } from '../keyboards/main'; // 👈 ДОДАНО: імпорт твого головного меню

export const handleStart = async (ctx: CommandContext<Context>) => {
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'Студент';
  const username = ctx.from?.username;

  const payload = ctx.match;
  
  if (!telegramId) return;

  try {
    // Шукаємо користувача в БД
    let user = await User.findOne({ telegramId });

    if (!user) {
      // 👈 Перевіряємо, чи перейшов юзер за реферальним посиланням
      let referredBy: number | undefined;
      if (payload && typeof payload === 'string' && payload.startsWith('ref_')) {
        const inviterId = parseInt(payload.replace('ref_', ''), 10);
        // Забороняємо запрошувати самого себе
        if (!isNaN(inviterId) && inviterId !== telegramId) {
          referredBy = inviterId;
        }
      }
      user = new User({
        telegramId,
        firstName,
        username,
        referredBy // 👈 Зберігаємо ID друга
      });
      await user.save();

      await ctx.reply(`Привіт, ${firstName}! 👋\n🌟 SnackEnglish допоможе тобі вивчати англійську легко та щодня.\n\nДавай почнемо! Обери свій поточний рівень:`, {
        reply_markup: levelKeyboard,
      });
    } else {
      // Оновлюємо дані про всяк випадок (якщо юзер змінив нік)
      user.username = username;
      await user.save();

      if (!user.level) {
        // Якщо користувач є, але рівень ще не обрав
        await ctx.reply('Ти ще не обрав свій рівень. Будь ласка, зроби це зараз:', {
          reply_markup: levelKeyboard,
        });
      } else {
        // 👈 ДОДАНО: прикріплюємо головне меню до привітання
        await ctx.reply(`З поверненням, ${firstName}! Твій рівень: ${user.level}. Готовий до нових слів? 🍪`, {
          reply_markup: createMainMenu()
        });
      }
    }
  } catch (error) {
    console.error('Помилка при реєстрації:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй пізніше.');
  }
};