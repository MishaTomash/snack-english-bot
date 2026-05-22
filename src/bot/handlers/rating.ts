import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRankInfo } from '../../services/progressService';

// Допоміжна функція для безпечного виводу імені
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

        // ─── ЛОГІКА ДЛЯ БЕЗКОШТОВНИХ КОРИСТУВАЧІВ (ЗАГЛУШКА) ───
        if (!currentUser.isPremium) {
            const freeMessage = 
                `🏆 *ТОП КОРИСТУВАЧІВ (Premium)*\n\n` +
                `🚫 _Тільки власники Premium беруть участь у рейтингу._\n\n` +
                `Отримай Premium, щоб змагатися та вигравати реальні призи!\n\n` +
                `*Призи для ТОП-5 наприкінці місяця:*\n` +
                `🥇 1 місце – 300 грн або наклейки\n` +
                `🥈 2 місце – 200 грн або наклейки\n` +
                `🥉 3 місце – 100 грн або наклейки\n` +
                `🏅 4-5 місце – ексклюзивні наклейки\n\n` +
                `Готовий кинути виклик найкращим? 👇`;

            const keyboard = new InlineKeyboard()
                .text('💎 Отримати Premium', 'buy_premium')
                .row()
                .text('← До профілю', 'show_profile_btn');

            if (ctx.callbackQuery) {
                return ctx.editMessageText(freeMessage, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
            }
            return ctx.reply(freeMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
        }

        // ─── ЛОГІКА ДЛЯ PREMIUM КОРИСТУВАЧІВ (РЕАЛЬНИЙ ТОП) ───
        
        // Знаходимо ТОП-3 преміум користувачів
        const topUsers = await User.find({ isPremium: true })
            .sort({ xp: -1 })
            .limit(3)
            .lean();

        // Знаходимо реальне місце поточного користувача
        // (Рахуємо, скільки людей мають БІЛЬШЕ XP, ніж він)
        const usersAhead = await User.countDocuments({ isPremium: true, xp: { $gt: currentUser.xp } });
        const userActualRank = usersAhead + 1;

        const dateStr = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
        
        let message = `🏆 *ТОП ПРЕМІУМ КОРИСТУВАЧІВ*\n_(станом на ${dateStr})_\n\n`;

        const medals = ['🥇', '🥈', '🥉'];
        let isUserInTop3 = false;

        // Виводимо першу трійку
        topUsers.forEach((u, index) => {
            const rankObj = getRankInfo(u.xp || 0);
            const isMe = u.telegramId === telegramId;
            if (isMe) isUserInTop3 = true;
            
            const nameStr = isMe ? '*Ви*' : formatName(u);
            message += `${medals[index]} ${index + 1}. ${nameStr} – Ранг ${rankObj.level} (${u.xp || 0} XP)\n`;
        });

        // 4-й рядок: показуємо самого користувача (якщо він не в топ-3)
        if (!isUserInTop3) {
            const myRankObj = getRankInfo(currentUser.xp || 0);
            message += `\n🏅 ${userActualRank}. *Ви* – Ранг ${myRankObj.level} (${currentUser.xp || 0} XP) 👈\n`;
        }

        message += `\n━━━━━━━━━━━━━━━━━━━\n*Призи в кінці місяця:*\n` +
                   `1 місце – 300 грн або наклейки\n` +
                   `2 місце – 200 грн або наклейки\n` +
                   `3 місце – 100 грн або наклейки\n` +
                   `4-5 місце – ексклюзивні наклейки\n\n`;

        // Математика відриву
        const myRankObj = getRankInfo(currentUser.xp || 0);
        if (myRankObj.level < 7) {
            message += `🔹 До наступного рангу: *${myRankObj.max - currentUser.xp} XP*\n`;
        }
        
        if (userActualRank > 3 && topUsers.length >= 3) {
            const xpToTop3 = topUsers[2].xp - currentUser.xp;
            message += `🚀 До ТОП-3 залишилось: *${Math.max(xpToTop3, 1)} XP*\n`;
        }

        const keyboard = new InlineKeyboard()
            .text('🔄 Оновити', 'show_top')
            .text('👤 Профіль', 'show_profile_btn');

        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
        } else {
            await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
        }

    } catch (error) {
        console.error('Помилка генерації ТОПу:', error);
        await ctx.reply('❌ Не вдалося завантажити рейтинг. Спробуйте пізніше.');
    }
};