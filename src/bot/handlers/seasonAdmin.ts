import { Context, InlineKeyboard, Bot } from 'grammy';
import { TopCycle } from '../../models/TopCycle';
import { endSeason, broadcastSeasonResults  } from '../../services/seasonService';
import { config } from '../../config'; // ✅ додай цей імпорт

// ✅ Тепер приймає number | undefined, а не Context
const isAdmin = (userId: number | undefined): boolean => userId === config.ADMIN_ID;

const pendingInput = new Map<number, 'date'>();

// ===== Головне меню — показує різний UI залежно від наявності сезону =====
export const handleSeasonAdminMenu = async (ctx: Context) => {
    if (!isAdmin(ctx.from?.id)) return;

    const activeCycle = await TopCycle.findOne({ isActive: true });

    if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery().catch(() => {});
    }

    // ← якщо немає активного сезону — показуємо кнопку створення
    if (!activeCycle) {
        const keyboard = new InlineKeyboard()
            .text('🆕 Створити новий сезон', 'season_create_new').row()
            .text('📅 Створити з датою', 'season_set_date');

        const text = `🏆 *Керування сезоном*\n\n⚠️ Активного сезону немає.\nСтвори новий сезон або вкажи дату завершення.`;

        if (ctx.callbackQuery) {
            return ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard }).catch(() => {});
        }
        return ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    }

    const text =
        `🏆 *Керування сезоном*\n\n` +
        `Сезон №${activeCycle.seasonNumber}\n` +
        `Завершується: ${activeCycle.endDate.toLocaleString('uk-UA')}\n\n` +
        `При завершенні сезону тобі надійде повідомлення з даними переможця.`;

    const keyboard = new InlineKeyboard()
        .text('🏁 Завершити сезон зараз', 'season_end_request').row()
        .text('📅 Змінити дату завершення', 'season_set_date');

    if (ctx.callbackQuery) {
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
        cycle.winners ?? [], // ← топ-3 переможці сезону
        cycle.seasonNumber
    );

    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await ctx.reply(`✅ Результати Сезону №${cycle.seasonNumber} надіслано всім!`);
};
export const handleSeasonCreateNew = async (ctx: Context) => {
    if (!isAdmin(ctx.from?.id)) return ctx.answerCallbackQuery({ text: '⛔ Немає доступу', show_alert: true });
    await ctx.answerCallbackQuery();

    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const lastCycle = await TopCycle.findOne().sort({ seasonNumber: -1 });
    const seasonNumber = (lastCycle?.seasonNumber ?? 0) + 1;

    await TopCycle.create({
        startDate: now,
        endDate,
        seasonNumber,
        isActive: true,
    });

    await ctx.editMessageText(
        `✅ Сезон №${seasonNumber} створено!\nЗавершується: ${endDate.toLocaleString('uk-UA')}`,
    );
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

    let activeCycle = await TopCycle.findOne({ isActive: true });

    // ← якщо немає активного — створюємо новий з вказаною датою
    if (!activeCycle) {
        const lastCycle = await TopCycle.findOne().sort({ seasonNumber: -1 });
        const seasonNumber = (lastCycle?.seasonNumber ?? 0) + 1;

        await TopCycle.create({
            startDate: new Date(),
            endDate: newDate,
            seasonNumber,
            isActive: true,
        });

        await ctx.reply(
            `✅ Сезон №${seasonNumber} створено!\nЗавершується: ${newDate.toLocaleString('uk-UA')}`
        );
        return true;
    }

    activeCycle.endDate = newDate;
    await activeCycle.save();

    await ctx.reply(`✅ Дату встановлено: ${newDate.toLocaleString('uk-UA')}`);
    return true;
};


// ===== Реєстрація 
export const registerSeasonAdminHandlers = (bot: Bot) => {
    bot.callbackQuery('season_end_request', handleSeasonEndRequest);
    bot.callbackQuery('season_end_confirm', handleSeasonEndConfirm);
    bot.callbackQuery('season_set_date', handleSeasonSetDateRequest);
    bot.callbackQuery('season_cancel', handleSeasonCancel);
    bot.callbackQuery('season_create_new', handleSeasonCreateNew); // ← новий
    bot.callbackQuery(/^broadcast_results_/, handleBroadcastResults);
};