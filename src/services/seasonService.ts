import { Api, InlineKeyboard } from 'grammy';
import { User } from '../models/User';
import { TopCycle, ITopCycleWinner } from '../models/TopCycle';
import { formatName } from '../bot/utils/format';
import { config } from '../config';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// 🥇🥈🥉 — скільки зірок отримує кожне місце
const PLACE_STARS = [50, 25, 25];
const MEDALS = ['🥇', '🥈', '🥉'];

// ✅ Топ-3 переможці сезону (замість одного)
export const findSeasonWinners = async (): Promise<ITopCycleWinner[]> => {
    const topPlayers = await User.find({ seasonXp: { $gt: 0 } })
        .sort({ seasonXp: -1 })
        .limit(3)
        .lean();

    return topPlayers.map((u, index) => ({
        place: index + 1,
        telegramId: u.telegramId,
        username: u.username ?? null,
        name: formatName(u),
        xp: u.seasonXp,
        stars: PLACE_STARS[index] ?? 0,
    }));
};

export const notifyAdminAboutWinners = async (
    api: Api,
    winners: ITopCycleWinner[],
    cycle: any
) => {
    const seasonNum = cycle?.seasonNumber ?? '?';
    const cycleId = cycle?._id?.toString() ?? 'latest';

    let text: string;

    if (winners.length > 0) {
        const winnersBlock = winners
            .map((w) => {
                const usernameStr = w.username ? `@${w.username}` : '(немає username)';
                const profileLink = w.username
                    ? `https://t.me/${w.username}`
                    : `tg://user?id=${w.telegramId}`;

                return (
                    `${MEDALS[w.place - 1] ?? '🏅'} <b>${w.place} місце — ${w.name}</b>\n` +
                    `🆔 Telegram ID: <code>${w.telegramId}</code>\n` +
                    `📱 Username: ${usernameStr}\n` +
                    `⭐ Балів: <b>${w.xp}</b> → наклейка на <b>${w.stars}⭐</b>\n` +
                    `🔗 <a href="${profileLink}">Відкрити профіль</a>`
                );
            })
            .join('\n\n');

        text =
            `🏆 <b>Сезон №${seasonNum} завершено!</b>\n\n` +
            `<b>Переможці:</b>\n\n` +
            `${winnersBlock}\n\n` +
            `1️⃣ Перейди за посиланнями\n` +
            `2️⃣ Надішли кожному наклейку вручну (50⭐ / 25⭐ / 25⭐)\n` +
            `3️⃣ Натисни кнопку нижче, щоб оголосити результати всім`;
    } else {
        text =
            `📢 <b>Сезон №${seasonNum} завершено!</b>\n\n` +
            `Переможців немає — ніхто не набрав балів 😔\n\n` +
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

// ✅ Розсилка результатів усім користувачам — тепер з топ-3
export const broadcastSeasonResults = async (
    api: Api,
    winners: ITopCycleWinner[],
    seasonNumber: number
) => {
    let message: string;
    let keyboard: InlineKeyboard;

    if (winners.length > 0) {
        const winnersBlock = winners
            .map((w) => `${MEDALS[w.place - 1] ?? '🏅'} <b>${w.name}</b> — ${w.xp} XP (наклейка ${w.stars}⭐)`)
            .join('\n');

        message =
            `🏆 <b>Сезон №${seasonNumber} завершено!</b>\n\n` +
            `${winnersBlock}\n\n` +
            `Вітаємо переможців! Наклейки вже летять у Telegram 🎁\n\n` +
            `——————————————\n` +
            `🆕 <b>Новий сезон — починається зараз!</b>\n\n` +
            `Хочеш наступного разу бути в топ-3?\n\n` +
            `💎 <b>Premium дає реальну перевагу:</b>\n` +
            `• Необмежена кількість слів на день\n` +
            `• Більше тестів = більше XP = вище в рейтингу\n` +
            `• Доступ до всіх тем і курсів\n\n` +
            `Поки інші зупиняються на ліміті — ти продовжуєш. 🚀`;

        keyboard = new InlineKeyboard();

        winners.forEach((w) => {
            if (w.username) {
                keyboard.url(`${MEDALS[w.place - 1] ?? '🏅'} Профіль: ${w.name}`, `https://t.me/${w.username}`).row();
            }
        });

        keyboard
            .text('💎 Отримати Premium', 'open_premium_menu').row()
            .text('🏆 Рейтинг', 'show_top');

    } else {
        message =
            `📢 <b>Сезон №${seasonNumber} завершено!</b>\n\n` +
            `Цього тижня наклейки нікому не дісталися 👀\n` +
            `Вони вже чекають на переможців наступного сезону!\n\n` +
            `——————————————\n` +
            `🆕 <b>Новий сезон — нова можливість!</b>\n\n` +
            `💎 <b>З Premium ти маєш більше шансів:</b>\n` +
            `• Вчи скільки хочеш слів — без ліміту\n` +
            `• Проходь більше тестів і набирай XP швидше\n` +
            `• Обганяй інших поки вони сплять 😏\n\n` +
            `Топ-3 наприкінці тижня заберуть наклейки: 50⭐ / 25⭐ / 25⭐ 🏆`;

        keyboard = new InlineKeyboard()
            .text('💎 Отримати Premium', 'open_premium_menu').row()
            .text('🏆 Рейтинг', 'show_top');
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
        } catch { }
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
    const winners = await findSeasonWinners();

    if (activeCycle) {
        activeCycle.isActive = false;
        activeCycle.winners = winners;

        // Legacy-поля лишаємо як дзеркало 1 місця (про всяк випадок, якщо десь ще використовуються)
        activeCycle.winnerTelegramId = winners[0]?.telegramId ?? null;
        activeCycle.winnerName = winners[0]?.name ?? null;
        activeCycle.winnerUsername = winners[0]?.username ?? null;
        activeCycle.winnerXp = winners[0]?.xp ?? 0;

        await activeCycle.save();
    }

    await resetAllSeasonXp();

    await createNewCycle(
        activeCycle
            ? { endDate: activeCycle.endDate, seasonNumber: activeCycle.seasonNumber }
            : null
    );

    await notifyAdminAboutWinners(api, winners, activeCycle);
};