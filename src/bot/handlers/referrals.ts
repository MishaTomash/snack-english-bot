import { Context } from 'grammy';
import { User } from '../../models/User';
import { buildReferralShareMessage, buildDefaultChainText } from '../utils/referral';

// 1. Хендлер для кнопки "👥 Запросити друзів"
export const handleReferralMenu = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    if (!user) return;

    const botInfo = await ctx.api.getMe();
    const invited = user.referralCount || 0;

    const text = buildDefaultChainText(invited);
    const { keyboard } = buildReferralShareMessage(botInfo.username!, telegramId, text);

    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// 2. Функція, яку ми викличемо, коли друг виконає "Мінімальну дію" (вивчить 5 слів)
export const checkAndRewardReferrer = async (ctx: Context, userId: number) => {
    try {
        const user = await User.findOne({ telegramId: userId });

        // Якщо він вже врахований, або його ніхто не запрошував - ігноруємо
        if (!user || !user.referredBy || user.hasCompletedMinAction) return;

        // Позначаємо, що цей юзер виконав дію
        user.hasCompletedMinAction = true;
        await user.save();

        // Шукаємо того, хто його запросив
        const inviter = await User.findOne({ telegramId: user.referredBy });
        if (!inviter) return;

        // Додаємо +1 до запрошених
        inviter.referralCount = (inviter.referralCount || 0) + 1;

        // 🏆 3+ запрошених → Premium на місяць (одноразова нагорода)
        if (inviter.referralCount >= 3 && !inviter.referralRewardClaimed) {
            inviter.referralRewardClaimed = true;
            inviter.isPremium = true;

            const premiumDate = new Date();
            premiumDate.setDate(premiumDate.getDate() + 30);
            inviter.premiumExpiresAt = premiumDate;

            await inviter.save();

            await ctx.api.sendMessage(inviter.telegramId,
                `🎉 *Вітаю!* Ти запросив 3 друзів, які почали вчити англійську.\n\n` +
                `Тобі автоматично нараховано *на місяць Premium БЕЗКОШТОВНО!* ⭐\n` +
                `Дякуємо, що розвиваєш спільноту 🙌`,
                { parse_mode: 'Markdown' }
            ).catch(() => { });

        // ⭐ Кожен наступний друг після 3-го → +200 XP до сезонного рейтингу
        } else if (inviter.referralCount > 3) {
            inviter.seasonXp = (inviter.seasonXp || 0) + 200;
            await inviter.save();

            await ctx.api.sendMessage(inviter.telegramId,
                `🔥 Ще один друг приєднався завдяки твоєму запрошенню!\n\n` +
                `Тобі нараховано *+200 XP* до сезонного рейтингу 🏆\n` +
                `Всього запрошено: *${inviter.referralCount}*`,
                { parse_mode: 'Markdown' }
            ).catch(() => { });

        } else {
            await inviter.save();
        }
    } catch (err) {
        console.error("Помилка реферальної системи:", err);
    }
};