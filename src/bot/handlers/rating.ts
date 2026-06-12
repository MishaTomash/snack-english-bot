import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { TopCycle } from '../../models/TopCycle';
import { formatName } from '../utils/format';

export const handleTopMenu = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => { });

    try {
        const currentUser = await User.findOne({ telegramId });
        if (!currentUser) return;

        const activeCycle = await TopCycle.findOne({ isActive: true });
        const endDateStr = activeCycle
            ? activeCycle.endDate.toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' })
            : 'Невідомо';

        const totalParticipants = await User.countDocuments({ seasonXp: { $gt: 0 } });

        const topUsers = await User.find({ seasonXp: { $gt: 0 } })
            .sort({ seasonXp: -1 }).limit(3).lean();

        const usersAhead = await User.countDocuments({ seasonXp: { $gt: currentUser.seasonXp || 0 } });
        const userRank = (currentUser.seasonXp || 0) > 0 ? usersAhead + 1 : 0;

        const medals = ['🥇', '🥈', '🥉'];
        let message = `🏆 *ТОП ТИЖНЯ* (до ${endDateStr})\n_Хто більше всього не спав?_ \n\n`;

        if (topUsers.length === 0) {
            message += `🙈 Поки ніхто не набрав балів. Стань першим — отримаєш кубок-наклейку і повагу бота.`;
        } else {
            let isUserInTop3 = false;
            topUsers.forEach((u, index) => {
                const isMe = u.telegramId === telegramId;
                if (isMe) isUserInTop3 = true;
                const nameStr = isMe ? '*Ти*' : formatName(u);
                message += `${medals[index]} ${index + 1}. ${nameStr} — ${u.seasonXp} балів\n`;
            });

            message += `\n━━━━━━━━━━━━━━━\n`;

            if (userRank === 0) {
                message += `🙈 Ти ще не в грі цього тижня.\nПройди тест — з'явись у рейтингу! 👇`;

            } else if (userRank === 1) {
                message += `👑 *Ти лідер цього тижня!*\n`;
                message += `Тримай позицію до кінця тижня — наклейка вже майже твоя 🏆\n`;
                message += `Але не розслабляйся — другий не спить 👀`;

            } else if (isUserInTop3) {
                const xpToFirst = topUsers[0].seasonXp - (currentUser.seasonXp || 0);
                message += `🥈 Ти в ТОП-3, але не №1!\n`;
                message += `До лідера: *${xpToFirst} балів* — наклейку зараз забере він.\n`;
                message += `Вчи далі і перехопи перше місце! 💪`;

            } else {
                const xpToTop3 = topUsers[2]?.seasonXp - (currentUser.seasonXp || 0);
                message += `📍 Твоє місце: *${userRank}* з ${totalParticipants}\n`;
                message += `Твої бали: ${currentUser.seasonXp}\n`;
                if (xpToTop3 > 0) {
                    message += `🚀 До ТОП-3 не вистачає *${xpToTop3} балів* — жми тест!`;
                }
            }
        }

        message += `\n\n🏆 Переможець тижня отримає Telegram-стікер-кубок (вартістю 100 зірочок ⭐) 🎁\n`
            + `і трохи поваги від системи 😄\n\n`
            + `давай вчитися!🚀`;

        const keyboard = new InlineKeyboard()
            .text('🔄 Оновити', 'show_top').text('👤 Профіль', 'show_profile_btn');

        if (ctx.callbackQuery) return ctx.editMessageText(message, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => { });
        return ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (error) {
        await ctx.reply('❌ Не вдалося завантажити рейтинг.');
    }
};