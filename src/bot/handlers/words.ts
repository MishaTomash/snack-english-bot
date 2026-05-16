import { CommandContext, Context } from 'grammy';
import { User } from '../../models/User';
import { getRandomWords } from '../../services/wordService';

export const handleWords = async (ctx: CommandContext<Context>) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  try {
    const user = await User.findOne({ telegramId });

    if (!user || !user.level) {
      return ctx.reply('Будь ласка, спочатку обери свій рівень за допомогою команди /start');
    }

    const words = await getRandomWords(user.level);

    if (words.length === 0) {
      return ctx.reply('На жаль, для твого рівня поки немає слів у базі 😔');
    }

    let message = `📚 **Твої слова на сьогодні (Рівень ${user.level}):**\n\n`;

    words.forEach((word) => {
      message += `🇺🇦 ${word.ukrainian}\n`;
      message += `🇬🇧 ${word.english}\n`;
      message += `🔤 ${word.transcription}\n\n`;
    });

    // Оновлюємо статистику користувача (кількість вивчених слів)
    user.wordsLearned += words.length;
    await user.save();

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Помилка при видачі слів:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.');
  }
};