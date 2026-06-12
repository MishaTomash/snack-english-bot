import { Context, InlineKeyboard, Bot } from 'grammy';
import { TopCycle } from '../../models/TopCycle';
import { endSeason, broadcastSeasonResults  } from '../../services/seasonService';
import { config } from '../../config'; // ✅ додай цей імпорт

// ✅ Тепер приймає number | undefined, а не Context
const isAdmin = (userId: number | undefined): boolean => userId === config.ADMIN_ID;

const pendingInput = new Map<number, 'date'>();

// ===== Головне меню =====
export const handleSeasonAdminMenu = async (ctx: Context) => {
    if (!isAdmin(ctx.from?.id)) return;

    const activeCycle = await TopCycle.findOne({ isActive: true });

    const text =
        `🏆 *Керування сезоном*\n\n` +
        `Сезон №${activeCycle?.seasonNumber ?? '-'}\n` +
        `Завершується: ${activeCycle ? activeCycle.endDate.toLocaleString('uk-UA') : 'невідомо'}\n\n` +
        `При завершенні сезону тобі надійде повідомлення з даними переможця — ти вручну надсилаєш йому подарунок, потім натискаєш кнопку розсилки.`;

    const keyboard = new InlineKeyboard()
        .text('🏁 Завершити сезон зараз', 'season_end_request').row()
        .text('📅 Змінити дату завершення', 'season_set_date');

    if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery().catch(() => {});
        return ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
    }

    return ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// ===== Завершити сезон зараз =====
export const handleSeasonEndRequest = async (ctx: Context) => {
    if (!isAdmin(ctx.from?.id)) return ctx.answerCallbackQuery({ text: '⛔ Немає доступу', show_alert: true });
    await ctx.answerCallbackQuery();

    const keyboard = new InlineKeyboard()
        .text('✅ Так, завершити', 'season_end_confirm')
        .text('❌ Скасувати', 'season_cancel');

    await ctx.editMessageText(
        '⚠️ Завершити поточний сезон зараз?\n\n' +
        '• Бот надішле тобі дані переможця\n' +
        '• Скине бали сезону у всіх до 0\n' +
        '• Запустить новий сезон (+7 днів)\n' +
        '• Ти вручну відправляєш подарунок і натискаєш кнопку розсилки',
        { reply_markup: keyboard }
    );
};

export const handleSeasonEndConfirm = async (ctx: Context) => {
    if (!isAdmin(ctx.from?.id)) return ctx.answerCallbackQuery({ text: '⛔ Немає доступу', show_alert: true });
    await ctx.answerCallbackQuery({ text: '⏳ Завершую сезон...' });

    await endSeason(ctx.api);

    await ctx.editMessageText(
        '✅ Сезон завершено!\n\nПеревір особисті повідомлення — там дані переможця і кнопка розсилки.'
    );
};

export const handleSeasonCancel = async (ctx: Context) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('❌ Скасовано.');
};

// ===== Розсилка результатів (після того як ти вручну надіслав подарунок) =====
export const handleBroadcastResults = async (ctx: Context) => {
    if (!isAdmin(ctx.from?.id)) return ctx.answerCallbackQuery({ text: '⛔ Немає доступу', show_alert: true });

    await ctx.answerCallbackQuery({ text: '⏳ Розсилаю...' });

    const cycleIdStr = ctx.callbackQuery?.data?.replace('broadcast_results_', '');

    let cycle;
    try {
        if (cycleIdStr && cycleIdStr !== 'latest') {
            cycle = await TopCycle.findById(cycleIdStr);
        }
    } catch {}

    if (!cycle) {
        cycle = await TopCycle.findOne({ isActive: false }).sort({ endDate: -1 });
    }

    if (!cycle) {
        return ctx.editMessageText('❌ Не знайдено завершеного сезону.');
    }

    await broadcastSeasonResults(
        ctx.api,
        cycle.winnerName,
        cycle.winnerUsername ?? null, // ← передаємо username
        cycle.winnerXp,
        cycle.seasonNumber
    );

    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await ctx.reply(`✅ Результати Сезону №${cycle.seasonNumber} надіслано всім!`);
};

// ===== Зміна дати завершення =====
export const handleSeasonSetDateRequest = async (ctx: Context) => {
    const adminId = ctx.from?.id;
    if (!isAdmin(adminId)) return ctx.answerCallbackQuery({ text: '⛔ Немає доступу', show_alert: true });

    pendingInput.set(adminId!, 'date');
    await ctx.answerCallbackQuery();
    await ctx.reply('📅 Введи нову дату завершення сезону у форматі:\nДД.ММ.РРРР ГГ:ММ\n\nНаприклад: 21.06.2026 12:00');
};

export const handlePendingTextInput = async (ctx: Context): Promise<boolean> => {
    const adminId = ctx.from?.id;
    if (!adminId || pendingInput.get(adminId) !== 'date') return false;

    const text = ctx.message?.text?.trim() || '';
    const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);

    if (!match) {
        await ctx.reply('❌ Невірний формат. Очікувалось: ДД.ММ.РРРР ГГ:ММ\nСпробуй ще раз.');
        return true;
    }

    const [, day, month, year, hour, minute] = match;
    const newDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));

    if (newDate.getTime() <= Date.now()) {
        await ctx.reply('❌ Дата має бути в майбутньому. Спробуй ще раз.');
        return true;
    }

    pendingInput.delete(adminId);

    const activeCycle = await TopCycle.findOne({ isActive: true });
    if (!activeCycle) {
        await ctx.reply('❌ Активного сезону не знайдено.');
        return true;
    }

    activeCycle.endDate = newDate;
    await activeCycle.save();

    await ctx.reply(`✅ Дату встановлено: ${newDate.toLocaleString('uk-UA')}`);
    return true;
};

// ===== Реєстрація =====
export const registerSeasonAdminHandlers = (bot: Bot) => {
    bot.callbackQuery('season_end_request', handleSeasonEndRequest);
    bot.callbackQuery('season_end_confirm', handleSeasonEndConfirm);
    bot.callbackQuery('season_set_date', handleSeasonSetDateRequest);
    bot.callbackQuery('season_cancel', handleSeasonCancel);
    bot.callbackQuery(/^broadcast_results_/, handleBroadcastResults);
}; 