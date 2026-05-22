import { Context } from 'grammy';
import { User } from '../../models/User';

export const showProfile = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
        const user = await User.findOne({ telegramId });
        if (!user) {
            return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
        }

        const streak = user.streak || 0;
        const wordsLearned = user.wordsLearned || 0;
        const testsPassed = user.testsPassed || 0;
        const xp = user.xp || 0;
        
        let accountStatus = '🆓 Безкоштовний';

        if (user.isPremium) {
            if (user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
                user.isPremium = false;
                user.premiumExpiresAt = undefined;
                await user.save();
                accountStatus = '🆓 Безкоштовний';
            } else {
                if (user.premiumExpiresAt) {
                    const formattedDate = user.premiumExpiresAt.toLocaleDateString('uk-UA', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    accountStatus = `💎 Premium до ${formattedDate}`;
                } else {
                    accountStatus = '💎 Premium';
                }
            }
        }

        const streakEmoji = streak > 0 ? '🔥' : '💤';

        // Розрахунок прогрес-бару та Рангу
        const LEVEL_SIZE = 1000; // Скільки XP треба для одного рангу
        const currentRank = Math.floor(xp / LEVEL_SIZE) + 1;
        const currentTierXp = xp % LEVEL_SIZE;
        const progressPercent = Math.floor((currentTierXp / LEVEL_SIZE) * 100);
        
        // Малюємо смужку прогресу: ▓▓▓▓▓▓░░░░
        const filledBars = Math.round(progressPercent / 10);
        const progressBar = '▓'.repeat(filledBars) + '░'.repeat(10 - filledBars);
        const xpLeft = LEVEL_SIZE - currentTierXp;

        const message = `👤 *Профіль SnackEnglish*\n\n` +
                        `🎓 Рівень: ${user.level || 'Не обрано'}\n` +
                        `${accountStatus}\n\n` +
                        `🏆 *Ранг ${currentRank}* (${xp} XP)\n` +
                        `${progressBar} ${progressPercent}%\n` +
                        `_До наступного рангу: ${xpLeft} XP_\n\n` +
                        `${streakEmoji} Серія: ${streak} дн.\n` +
                        `📚 Вивчено слів: ${wordsLearned}\n` +
                        `📝 Тестів пройдено: ${testsPassed}\n\n` +
                        `🏆 _Продовжуй щодня — прогрес уже видно._`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Помилка завантаження профілю користувача:', error);
        await ctx.reply('❌ Не вдалося завантажити дані профілю. Спробуйте пізніше.');
    }
};