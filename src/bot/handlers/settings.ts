import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';

export const showSettings = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    if (!user) {
        return ctx.reply('Користувача не знайдено. Введіть /start для реєстрації.');
    }

    const message = `⚙️ *Налаштування вашого профілю*\n\n` +
        `📊 Ваш поточний рівень англійської: *${user.level || 'Не обрано'}*\n\n` +
        `Ви можете змінити його в будь-який момент, натиснувши на кнопку нижче.`;

    const keyboard = new InlineKeyboard()
        .text('🔄 Змінити рівень англійської', 'change_level');

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
};

// Хендлер, який реагує на клік "Змінити рівень англійської"
export const handleChangeLevelClick = async (ctx: Context) => {
    await ctx.answerCallbackQuery().catch(() => console.log('⏳ Пропущено старий callback_query'));

    const keyboard = new InlineKeyboard()
        .text('A1', 'level_A1').text('A2', 'level_A2').row()
        .text('B1', 'level_B1').text('B2', 'level_B2').row()
        .text('C1', 'level_C1').text('C2', 'level_C2');

    await ctx.reply('Оберіть новий рівень англійської мови:', {
        reply_markup: keyboard
    });
};