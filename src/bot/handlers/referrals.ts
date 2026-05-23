import { Context } from 'grammy';
import { User } from '../../models/User';

// 1. Хендлер для кнопки "👥 Запросити друзів"
export const handleReferralMenu = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    if (!user) return;

    const botInfo = await ctx.api.getMe();
    const refLink = `https://t.me/${botInfo.username}?start=ref_${telegramId}`;
    const invited = user.referralCount || 0;

    const text = `👥 *Запроси друзів — отримай Premium БЕЗКОШТОВНО*

Твоє реферальне посилання:
\`${refLink}\`

━━━━━━━━━━━━━━━━━━━━━
🎯 *Умова:* 3 друзі, які почнуть вчити англійську
✅ *Прогрес:* ${invited}/3 друзів
🏆 *Нагорода:* Premium до кінця сезону
━━━━━━━━━━━━━━━━━━━━━

⭐ *Що дасть Premium:*
• Безліміт слів щодня
• Участь у турнірі з призами 🏆
• Доступні всі курси + тести


💡 *Важливо:* друг має вивчити 5 слів — тільки тоді запрошення зарахується
`;
    await ctx.reply(text, { parse_mode: 'Markdown' });
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

        // Перевіряємо, чи досяг він 3 запрошених
        if (inviter.referralCount >= 3 && !inviter.referralRewardClaimed) {
            inviter.referralRewardClaimed = true;
            inviter.isPremium = true;

            // Даємо преміум на 30 днів
            const premiumDate = new Date();
            premiumDate.setDate(premiumDate.getDate() + 30);
            inviter.premiumExpiresAt = premiumDate;

            await inviter.save();

            // Надсилаємо повідомлення щасливчику!
            await ctx.api.sendMessage(inviter.telegramId,
                `🎉 *Вітаю!* Ти запросив 3 друзів, які почали вчити англійську.\n\n` +
                `Тобі автоматично нараховано *до кінця сезонуPremium БЕЗКОШТОВНО!* ⭐\n` +
                `Дякуємо, що розвиваєш спільноту 🙌`,
                { parse_mode: 'Markdown' }
            ).catch(() => { });
        } else {
            await inviter.save();
        }
    } catch (err) {
        console.error("Помилка реферальної системи:", err);
    }
};