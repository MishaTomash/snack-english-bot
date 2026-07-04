import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { TopCycle } from '../../models/TopCycle';
import { formatName } from '../utils/format';

export const handleTopMenu = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => {});

    try {
        const currentUser = await User.findOne({ telegramId });
        if (!currentUser) return;

        const activeCycle = await TopCycle.findOne({ isActive: true });
        const endDateStr = activeCycle
            ? activeCycle.endDate.toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' })
            : 'Невідомо';

        const totalParticipants = await User.countDocuments({ seasonXp: { $gt: 0 } });
        const topUsers = await User.find({ seasonXp: { $gt: 0 } })
            .sort({ seasonXp: -1 }).limit(10).lean();

        const usersAhead = await User.countDocuments({ seasonXp: { $gt: currentUser.seasonXp || 0 } });
        const userRank = (currentUser.seasonXp || 0) > 0 ? usersAhead + 1 : 0;

        const medals = ['🥇', '🥈', '🥉'];
        const top3 = topUsers.slice(0, 3);

        let message = `🏆 *Рейтинг тижня* — до ${endDateStr}\n\n`;

        if (topUsers.length === 0) {
            message += `😴 Поки тут порожньо.\nБудь першим — вчи слова і з'явись у топі!`;
        } else {
            topUsers.forEach((u, index) => {
                const isMe = u.telegramId === telegramId;
                const nameStr = isMe ? '👤 *Ти*' : formatName(u);
                const premium = u.isPremium ? ' 💎' : '';
                const place = medals[index] ?? `${index + 1}.`;
                message += `${place} ${nameStr}${premium} — *${u.seasonXp} XP*\n`;
            });

            message += `\n━━━━━━━━━━━━━━━\n`;

            if (userRank === 0) {
                message +=
                    `😶 Тебе ще немає в рейтингу.\n` +
                    `Пройди тест або вивчи слова — і ти вже в грі.\n\n` +
                    `💎 З Premium можна вчити без ліміту — і рости швидше за всіх 👇`;

            } else if (userRank === 1) {
                message +=
                    `👑 *Ти на першому місці!*\n` +
                    `${currentUser.seasonXp} XP — поки що ніхто не дістав.\n\n` +
                    `Не зупиняйся — другий місць не спить 👀`;

            } else if (top3.some(u => u.telegramId === telegramId)) {
                const xpToFirst = top3[0].seasonXp - (currentUser.seasonXp || 0);
                message +=
                    `🔥 Ти в ТОП-3! Але перше місце ще не твоє.\n` +
                    `До лідера: *${xpToFirst} XP*\n\n` +
                    `💎 Premium знімає ліміт на слова і тести — наздожени лідера сьогодні!`;

            } else {
                const xpToTop3 = (top3[2]?.seasonXp ?? 0) - (currentUser.seasonXp || 0);
                message +=
                    `📍 Твоє місце: *${userRank}* з ${totalParticipants} учасників\n` +
                    `Твої XP цього тижня: *${currentUser.seasonXp}*\n`;

                if (xpToTop3 > 0) {
                    message +=
                        `До ТОП-3 не вистачає: *${xpToTop3} XP*\n\n` +
                        `💎 З Premium — більше слів, більше тестів, більше XP.\n` +
                        `Реальний шанс потрапити в топ цього тижня 👇`;
                }
            }
        }

        message +=
            `\n\n━━━━━━━━━━━━━━━\n` +
            `🎁 Топ-3 отримують наклейку-кубок: 🥇 50⭐ · 🥈 25⭐ · 🥉 25⭐\n` +
            `Наступний переможець — можливо ти.`;

        const keyboard = new InlineKeyboard()
            .text('🔄 Оновити', 'show_top')
            .text('👤 Профіль', 'show_profile_btn').row()
            .text('💎 Отримати Premium', 'open_premium_menu');

        if (ctx.callbackQuery) {
            return ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
        }
        return ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });

    } catch (error) {
        await ctx.reply('❌ Не вдалося завантажити рейтинг.');
    }
};