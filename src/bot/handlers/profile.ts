import { Context } from 'grammy';
import { User } from '../../models/User';

export const showProfile = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    if (!user) {
        return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
    }

    const streak = user.streak || 1;
    const wordsLearned = user.wordsLearned || 0;
    const testsPassed = user.testsPassed || 0;
    const wordsToday = user.wordsLearnedToday || 0;
    
    // Визначаємо статус для красивого відображення
    const accountStatus = user.isPremium ? '💎 Premium' : '🆓 Базовий';

    const message = `👤 *Твій профіль SnackEnglish*\n\n` +
        `🎓 Рівень: ${user.level || 'Не обрано'}\n` +
        `⭐️ Статус: ${accountStatus}\n\n` +
        `📊 *Статистика:*\n` +
        `🔥 Дні поспіль: ${streak}\n` +
        `📚 Вивчено слів всього: ${wordsLearned}\n` +
        `📖 Слів вивчено сьогодні: ${wordsToday}\n` +
        `✅ Пройдено тестів: ${testsPassed}\n\n` +
        (user.isPremium 
            ? `Дякуємо за підтримку! Насолоджуйся безлімітним навчанням 🚀` 
            : `💡 Отримай безліміт слів та озвучку з Premium! Натисни кнопку в меню.`);

    await ctx.reply(message, { parse_mode: 'Markdown' });
};