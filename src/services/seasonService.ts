import { Api, InlineKeyboard } from 'grammy';
import { User } from '../models/User';
import { TopCycle } from '../models/TopCycle';
import { formatName } from '../bot/utils/format';
import { config } from '../config';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const findSeasonWinner = async () => {
    return await User.findOne({ seasonXp: { $gt: 0 } }).sort({ seasonXp: -1 }).lean();
};

export const notifyAdminAboutWinner = async (api: Api, winner: any, cycle: any) => {
    const seasonNum = cycle?.seasonNumber ?? '?';
    const cycleId = cycle?._id?.toString() ?? 'latest';

    let text: string;

    if (winner) {
        const usernameStr = winner.username ? `@${winner.username}` : '(немає username)';
        const profileLink = winner.username
            ? `https://t.me/${winner.username}`
            : `tg://user?id=${winner.telegramId}`;

        text =
            `🏆 <b>Сезон №${seasonNum} завершено!</b>\n\n` +
            `<b>Переможець:</b>\n` +
            `👤 Ім'я: ${formatName(winner)}\n` +
            `🆔 Telegram ID: <code>${winner.telegramId}</code>\n` +
            `📱 Username: ${usernameStr}\n` +
            `⭐ Балів: <b>${winner.seasonXp}</b>\n\n` +
            `🔗 <a href="${profileLink}">Відкрити профіль</a>\n\n` +
            `1️⃣ Перейди за посиланням\n` +
            `2️⃣ Надішли наклейку вручну\n` +
            `3️⃣ Натисни кнопку нижче`;
    } else {
        text =
            `📢 <b>Сезон №${seasonNum} завершено!</b>\n\n` +
            `Переможця немає — ніхто не набрав балів 😔\n\n` +
            `Натисни кнопку нижче — бот повідомить всіх.`;
    }

    const keyboard = new InlineKeyboard()
        .text('📢 Оголосити результати всім', `broadcast_results_${cycleId}`);

    await api.sendMessage(config.ADMIN_ID, text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
        link_preview_options: { is_disabled: true },
    });
};

// ✅ Оновлений текст розсилки + кнопки для користувачів
export const broadcastSeasonResults = async (
    api: Api,
    winnerName: string | null,
    winnerUsername: string | null,
    winnerXp: number,
    seasonNumber: number
) => {
    let message: string;
    let keyboard: InlineKeyboard;

    if (winnerName) {
        message =
            `🏆 <b>ПЕРЕМОЖЕЦЬ ТИЖНЯ — Сезон №${seasonNumber}!</b>\n\n` +
            `👑 <b>${winnerName}</b> щойно отримав ексклюзивну наклейку-кубок прямо в Telegram!\n\n` +
            `<i>Вчив слова щодня, посів ТОП-1 і забрав нагороду</i> 🎁\n\n` +
            `——————————————\n` +
            `🆕 <b>Новий тиждень — нова боротьба!</b>\n\n` +
            `Хочеш так само?\n` +
            `Всього кілька слів на день — і ти в грі.\n` +
            `Перший у рейтингу наприкінці тижня отримає наклейку! 🏆\n\n` +
            `👇 Починай прямо зараз:`;

        keyboard = new InlineKeyboard();

        if (winnerUsername) {
            keyboard.url(`👑 Профіль переможця`, `https://t.me/${winnerUsername}`).row();
        }

        keyboard.text('🏆 Переглянути рейтинг', 'show_top');

    } else {
        message =
            `📢 <b>Сезон №${seasonNumber} завершено!</b>\n\n` +
            `Цього тижня ніхто не взяв наклейку 👀\n\n` +
            `——————————————\n` +
            `🆕 <b>Новий тиждень — нова можливість!</b>\n\n` +
            `Наклейка ще нікому не дісталась — вона чекає на тебе.\n` +
            `Вчи слова щодня і будь першим у рейтингу! 🏆`;

        keyboard = new InlineKeyboard()
            .text('🏆 Переглянути рейтинг', 'show_top');
    }

    const users = await User.find({}, { telegramId: 1 }).lean();
    let sent = 0;

    for (const u of users) {
        try {
            await api.sendMessage(u.telegramId, message, {
                parse_mode: 'HTML',
                reply_markup: keyboard,
            });
            sent++;
        } catch {}
        await new Promise((r) => setTimeout(r, 40));
    }

    console.log(`✅ Розсилка Сезон №${seasonNumber}: ${sent}/${users.length}`);
};

export const resetAllSeasonXp = async () => {
    await User.updateMany({}, { $set: { seasonXp: 0 } });
};

export const createNewCycle = async (prev?: { endDate: Date; seasonNumber: number } | null) => {
    const now = new Date();
    const baseDate = prev ? prev.endDate : now;
    const newEndDate = new Date(baseDate.getTime() + SEVEN_DAYS_MS);

    return await TopCycle.create({
        startDate: now,
        endDate: newEndDate,
        seasonNumber: (prev?.seasonNumber ?? 0) + 1,
        isActive: true,
    });
};

export const ensureActiveCycle = async () => {
    const active = await TopCycle.findOne({ isActive: true });
    if (active) return active;
    return await createNewCycle(null);
};

export const endSeason = async (api: Api) => {
    const activeCycle = await TopCycle.findOne({ isActive: true });
    const winner = await findSeasonWinner();

    if (activeCycle) {
        activeCycle.isActive = false;
        activeCycle.winnerTelegramId = winner?.telegramId ?? null;
        activeCycle.winnerName = winner ? formatName(winner) : null;
        activeCycle.winnerUsername = winner?.username ?? null; // ← зберігаємо username
        activeCycle.winnerXp = winner?.seasonXp ?? 0;
        await activeCycle.save();
    }

    await resetAllSeasonXp();

    await createNewCycle(
        activeCycle
            ? { endDate: activeCycle.endDate, seasonNumber: activeCycle.seasonNumber }
            : null
    );

    await notifyAdminAboutWinner(api, winner, activeCycle);
};