import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRankInfo } from '../../services/progressService';
import { TopCycle } from '../../models/TopCycle';

const formatName = (user: any) => {
    if (user.firstName) return user.firstName;
    if (user.username) return `@${user.username}`;
    return 'Користувач';
};

export const handleTopMenu = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

    try {
        const currentUser = await User.findOne({ telegramId });
        if (!currentUser) return;

        // Дістаємо поточний сезон
        const activeCycle = await TopCycle.findOne({ isActive: true });
        const endDateStr = activeCycle ? activeCycle.endDate.toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' }) : 'Невідомо';

        if (!currentUser.isPremium) {
            const freeMessage = 
                `🏆 *ТОП КОРИСТУВАЧІВ (Premium)*\n\n` +
                `🚫 _Тільки власники Premium беруть участь у рейтингу._\n\n` +
                `Отримай Premium, щоб змагатися та вигравати реальні призи!\n\n` +
                `*Призи для ТОП-5 наприкінці сезону (${endDateStr}):*\n` +
                `🥇 1 місце – 300 грн або наклейки\n` +
                `🥈 2 місце – 200 грн або наклейки\n` +
                `🥉 3 місце – 100 грн або наклейки\n` +
                `🏅 4-5 місце – ексклюзивні наклейки\n\n` +
                `Готовий кинути виклик найкращим? 👇`;

            const keyboard = new InlineKeyboard()
                .text('💎 Отримати Premium', 'buy_premium')
                .row()
                .text('← До профілю', 'show_profile_btn');

            if (ctx.callbackQuery) return ctx.editMessageText(freeMessage, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
            return ctx.reply(freeMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
        }
        
        // Знаходимо ТОП-3 преміум користувачів (сортуємо за сезонним XP)
        const topUsers = await User.find({ isPremium: true, seasonXp: { $gt: 0 } })
            .sort({ seasonXp: -1 }).limit(3).lean();

        const usersAhead = await User.countDocuments({ isPremium: true, seasonXp: { $gt: currentUser.seasonXp || 0 } });
        const userActualRank = usersAhead + 1;
        
        let message = `🏆 *ТОП ПРЕМІУМ КОРИСТУВАЧІВ*\n_(Сезон діє до ${endDateStr})_\n\n`;

        const medals = ['🥇', '🥈', '🥉'];
        let isUserInTop3 = false;

        topUsers.forEach((u, index) => {
            const rankObj = getRankInfo(u.xp || 0); // Ранг лишається загальним!
            const isMe = u.telegramId === telegramId;
            if (isMe) isUserInTop3 = true;
            const nameStr = isMe ? '*Ви*' : formatName(u);
            message += `${medals[index]} ${index + 1}. ${nameStr} – Ранг ${rankObj.level} (${u.seasonXp || 0} балів сезону)\n`;
        });

        if (!isUserInTop3 && (currentUser.seasonXp || 0) > 0) {
            const myRankObj = getRankInfo(currentUser.xp || 0);
            message += `\n🏅 ${userActualRank}. *Ви* – Ранг ${myRankObj.level} (${currentUser.seasonXp || 0} балів сезону) 👈\n`;
        } else if (!isUserInTop3) {
            message += `\n🏅 *Ви* ще не заробили балів у цьому сезоні. Пройдіть тест! 👈\n`;
        }

        message += `\n━━━━━━━━━━━━━━━━━━━\n*Призи в кінці сезону:*\n` +
                   `1 місце – 300 грн або наклейки\n2 місце – 200 грн або наклейки\n` +
                   `3 місце – 100 грн або наклейки\n4-5 місце – ексклюзивні наклейки\n\n`;

        if (userActualRank > 3 && topUsers.length >= 3) {
            const xpToTop3 = topUsers[2].seasonXp - (currentUser.seasonXp || 0);
            message += `🚀 До ТОП-3 залишилось: *${Math.max(xpToTop3, 1)} балів*\n`;
        }

        const keyboard = new InlineKeyboard()
            .text('🔄 Оновити', 'show_top').text('👤 Профіль', 'show_profile_btn');

        if (ctx.callbackQuery) return ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
        return ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (error) {
        await ctx.reply('❌ Не вдалося завантажити рейтинг.');
    }
};