import { Context } from 'grammy';
import { User } from '../../models/User';

export const showProfile = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    if (!user) {
        return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
    }

    const streak = user.streakDays || 1;
    const wordsLearned = user.wordsLearned || 0;
    const testsPassed = user.testsPassed || 0;

    const message = `👤 *Твій профіль SnackEnglish*\n\n` +
                    `🎓 Рівень: ${user.level || 'Не обрано'}\n` +
                    `🔥 Дні поспіль: ${streak}\n` +
                    `📚 Вивчено слів: ${wordsLearned}\n` +
                    `✅ Пройдено тестів: ${testsPassed}\n\n` +
                    `Продовжуй у тому ж дусі! 🚀`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
};