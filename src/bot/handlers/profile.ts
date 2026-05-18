import { Context } from 'grammy';
import { User } from '../../models/User';

export const showProfile = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
        const user = await User.findOne({ telegramId });
        if (!user) {
            return ctx.reply('Будь ласка, спочатку обери свій уровень: /start');
        }

        // Беремо дані з бази, якщо їх немає — ставимо 0
        const streak = user.streak || 0;
        const wordsLearned = user.wordsLearned || 0;
        const testsPassed = user.testsPassed || 0;
        const wordsToday = user.wordsLearnedToday || 0;
        
        let accountStatus = '🆓 Безкоштовний';
        let premiumInfo = '';

        // Перевірка придатності Premium підписки
        if (user.isPremium) {
            if (user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
                user.isPremium = false;
                user.premiumExpiresAt = undefined;
                await user.save();
                accountStatus = '🆓 Безкоштовний';
            } else {
                accountStatus = '💎 Premium';
                
                if (user.premiumExpiresAt) {
                    const formattedDate = user.premiumExpiresAt.toLocaleDateString('uk-UA', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    premiumInfo = `\n📅 *Діє до:* ${formattedDate}`;
                }
            }
        }

        // Генеруємо мотиваційні вогники залежно від кількості днів поспіль
        const streakEmoji = streak > 0 ? '🔥'.repeat(Math.min(streak, 3)) : '💤';

        const message = `👤 *ТВІЙ ПРОФІЛЬ SNACKENGLISH*\n\n` +
                        `🎓 *Поточний рівень:* ${user.level || 'Не обрано'}\n` +
                        `⭐️ *Статус акаунту:* ${accountStatus}${premiumInfo}\n\n` +
                        `📊 *Твій прогрес навчання:*\n` +
                        `${streakEmoji} Активність: *${streak} дн. поспіль*\n` +
                        `📚 Вивчено слів всього: *${wordsLearned}*\n` +
                        `📝 Слів вивчено сьогодні: *${wordsToday}*\n` +
                        `🎯 Пройдено тестів: *${testsPassed}*\n\n` +
                        `🏆 _Продовжуй у тому ж дусі! Кожен день наближає тебе до мети._`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Помилка завантаження профілю користувача:', error);
        await ctx.reply('❌ Не вдалося завантажити дані профілю. Спробуйте пізніше.');
    }
};