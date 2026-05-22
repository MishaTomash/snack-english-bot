import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRankInfo } from '../../services/progressService';
import { TopCycle } from '../../models/TopCycle';

// Екранування, щоб імена не ламали розмітку
const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatName = (user: any) => {
    let name = 'Користувач';
    if (user.firstName) name = user.firstName;
    else if (user.username) name = `@${user.username}`;
    return escapeHtml(name);
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
                `🏆 <b>ТОП КОРИСТУВАЧІВ (Premium)</b>\n\n` +
                `🚫 <i>Тільки власники Premium беруть участь у рейтингу.</i>\n\n` +
                `Отримай Premium, щоб змагатися та вигравати реальні призи!\n\n` +
                `<b>Призи для ТОП-5 наприкінці сезону (${endDateStr}):</b>\n` +
                `🥇 1 місце – 300 грн або наклейки\n` +
                `🥈 2 місце – 200 грн або наклейки\n` +
                `🥉 3 місце – 100 грн або наклейки\n` +
                `🏅 4-5 місце – ексклюзивні наклейки\n\n` +
                `Готовий кинути виклик найкращим? 👇`;

            const keyboard = new InlineKeyboard()
                .text('💎 Отримати Premium', 'buy_premium')
                .row()
                .text('← До профілю', 'show_profile_btn');

            if (ctx.callbackQuery) return ctx.editMessageText(freeMessage, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
            return ctx.reply(freeMessage, { parse_mode: 'HTML', reply_markup: keyboard });
        }
        
        // Знаходимо ТОП-3 преміум користувачів
        const topUsers = await User.find({ isPremium: true, seasonXp: { $gt: 0 } })
            .sort({ seasonXp: -1 }).limit(3).lean();

        const usersAhead = await User.countDocuments({ isPremium: true, seasonXp: { $gt: currentUser.seasonXp || 0 } });
        const userActualRank = usersAhead + 1;
        
        let message = `🏆 <b>ТОП ПРЕМІУМ КОРИСТУВАЧІВ</b>\n<i>(Сезон діє до ${endDateStr})</i>\n\n`;

        const medals = ['🥇', '🥈', '🥉'];
        let isUserInTop3 = false;

        topUsers.forEach((u, index) => {
            const rankObj = getRankInfo(u.xp || 0);
            const isMe = u.telegramId === telegramId;
            if (isMe) isUserInTop3 = true;
            const nameStr = isMe ? '<b>Ви</b>' : formatName(u);
            message += `${medals[index]} ${index + 1}. ${nameStr} – Ранг ${rankObj.level} (${u.seasonXp || 0} балів сезону)\n`;
        });

        if (!isUserInTop3 && (currentUser.seasonXp || 0) > 0) {
            const myRankObj = getRankInfo(currentUser.xp || 0);
            message += `\n🏅 ${userActualRank}. <b>Ви</b> – Ранг ${myRankObj.level} (${currentUser.seasonXp || 0} балів сезону) 👈\n`;
        } else if (!isUserInTop3) {
            message += `\n🏅 <b>Ви</b> ще не заробили балів у цьому сезоні. Пройдіть тест! 👈\n`;
        }

        message += `\n━━━━━━━━━━━━━━━━━━━\n<b>Призи в кінці сезону:</b>\n` +
                   `1 місце – 300 грн або наклейки\n2 місце – 200 грн або наклейки\n` +
                   `3 місце – 100 грн або наклейки\n4-5 місце – ексклюзивні наклейки\n\n`;

        if (userActualRank > 3 && topUsers.length >= 3) {
            const xpToTop3 = topUsers[2].seasonXp - (currentUser.seasonXp || 0);
            message += `🚀 До ТОП-3 залишилось: <b>${Math.max(xpToTop3, 1)} балів</b>\n`;
        }

        const keyboard = new InlineKeyboard()
            .text('🔄 Оновити', 'show_top').text('👤 Профіль', 'show_profile_btn');

        if (ctx.callbackQuery) return ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
        return ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (error) {
        await ctx.reply('❌ Не вдалося завантажити рейтинг.');
    }
};