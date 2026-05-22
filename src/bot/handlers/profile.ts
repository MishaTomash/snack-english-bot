import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRankInfo } from '../../services/progressService';

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
            } else {
                if (user.premiumExpiresAt) {
                    const formattedDate = user.premiumExpiresAt.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    accountStatus = `💎 Premium до ${formattedDate}`;
                } else {
                    accountStatus = '💎 Premium';
                }
            }
        }

        const streakEmoji = streak > 0 ? '🔥' : '💤';

        // Визначаємо ранг через єдиний сервіс
        const rankInfo = getRankInfo(xp);
        const currentTierXp = xp - rankInfo.min;
        const tierSize = rankInfo.max - rankInfo.min;
        
        let progressBar = '▓▓▓▓▓▓▓▓▓▓';
        let progressPercent = 100;
        let xpLeftStr = 'Максимальний ранг!';

        if (rankInfo.level < 7) {
            progressPercent = Math.floor((currentTierXp / tierSize) * 100);
            const filledBars = Math.round(progressPercent / 10);
            progressBar = '▓'.repeat(filledBars) + '░'.repeat(10 - filledBars);
            xpLeftStr = `До наступного рангу: ${rankInfo.max - xp} XP`;
        }

        const message = `👤 *Профіль SnackEnglish*\n\n` +
                        `🎓 Рівень: ${user.level || 'Не обрано'}\n` +
                        `${accountStatus}\n\n` +
                        `🏆 *Ранг ${rankInfo.level}: ${rankInfo.name}* (${xp} XP)\n` +
                        `${progressBar} ${progressPercent}%\n` +
                        `_${xpLeftStr}_\n\n` +
                        `${streakEmoji} Серія: ${streak} дн.\n` +
                        `📚 Вивчено слів: ${wordsLearned}\n` +
                        `📝 Тестів пройдено: ${testsPassed}\n\n` +
                        `🏆 _Продовжуй щодня — прогрес уже видно._`;

        const keyboard = new InlineKeyboard().text('🏆 Топ користувачів', 'show_top');

        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
        } else {
            await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
        }
    } catch (error) {
        console.error('Помилка завантаження профілю користувача:', error);
        await ctx.reply('❌ Не вдалося завантажити дані профілю. Спробуйте пізніше.');
    }
};