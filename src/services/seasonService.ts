import { Api } from 'grammy';
import { User } from '../models/User';
import { TopCycle } from '../models/TopCycle';
import { getSettings } from '../models/BotSettings';
import { formatName } from '../bot/utils/format';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Знаходить переможця сезону (1 місце)
export const findSeasonWinner = async () => {
    return await User.findOne({ seasonXp: { $gt: 0 } }).sort({ seasonXp: -1 }).lean();
};

// Надсилає наклейку-кубок переможцю (з налаштувань, встановлених адміном)
export const sendTrophySticker = async (api: Api, winner: any) => {
    const settings = await getSettings();

    if (!settings.trophyStickerId) {
        console.warn('⚠️ Наклейку-кубок не встановлено в адмінці — пропускаю відправку.');
        return;
    }

    try {
        await api.sendSticker(winner.telegramId, settings.trophyStickerId);
        await api.sendMessage(
            winner.telegramId,
            `🏆 Вітаємо! Ти зайняв 1 місце цього тижня з *${winner.seasonXp}* балами!\nТримай свій кубок 👆`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        console.error('Не вдалося надіслати кубок переможцю:', e);
    }
};

// Розсилка підсумків сезону всім користувачам
export const broadcastSeasonResults = async (api: Api, winner: any | null) => {
    const message = winner
        ? `📢 *Підсумки тижня!*\n\n🏆 Переможець: *${formatName(winner)}* з ${winner.seasonXp} балами!\nВітаємо його 🎉\n\nРейтинг скинуто — починається новий тиждень. Вперед за новим кубком! 💪`
        : `📢 *Новий тиждень почався!*\n\nЦього разу переможця немає — ніхто не набрав балів 😔\nРейтинг скинуто. Спробуй стати першим цього тижня! 💪`;

    const users = await User.find({}, { telegramId: 1 }).lean();

    for (const u of users) {
        try {
            await api.sendMessage(u.telegramId, message, { parse_mode: 'Markdown' });
        } catch {
            // юзер заблокував бота — пропускаємо
        }
        await new Promise((r) => setTimeout(r, 40));
    }
};

// Скидання сезонних балів усім
export const resetAllSeasonXp = async () => {
    await User.updateMany({}, { $set: { seasonXp: 0 } });
};

// Створення нового сезону: +7 днів від попередньої дати завершення
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

// Якщо активного сезону немає взагалі — створити перший
export const ensureActiveCycle = async () => {
    const active = await TopCycle.findOne({ isActive: true });
    if (active) return active;
    return await createNewCycle(null);
};

// Головна функція завершення сезону
export const endSeason = async (api: Api) => {
    const activeCycle = await TopCycle.findOne({ isActive: true });
    const winner = await findSeasonWinner();

    if (winner) {
        await sendTrophySticker(api, winner);
    }

    await broadcastSeasonResults(api, winner);
    await resetAllSeasonXp();

    if (activeCycle) {
        activeCycle.isActive = false;
        activeCycle.winnerTelegramId = winner?.telegramId ?? null;
        activeCycle.winnerName = winner ? formatName(winner) : null;
        activeCycle.winnerXp = winner?.seasonXp ?? 0;
        await activeCycle.save();
    }

    await createNewCycle(
        activeCycle ? { endDate: activeCycle.endDate, seasonNumber: activeCycle.seasonNumber } : null
    );
};