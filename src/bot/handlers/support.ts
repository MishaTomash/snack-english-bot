import { Context, InlineKeyboard } from 'grammy';

// 1. Виведення меню з вибором кількості зірочок
export const handleSupportMenu = async (ctx: Context) => {
    const keyboard = new InlineKeyboard()
        .text('⭐️ 15', 'stars_15')
        .text('⭐️ 50', 'stars_50')
        .row()
        .text('⭐️ 100', 'stars_100')
        .text('⭐️ 500', 'stars_500');

    await ctx.reply(
        '💖 *Підтримка SnackEnglish*\n\n' +
        'Якщо тобі подобається мій бот і ти хочеш допомогти йому розвиватися, ти можеш пригостити розробника зірочками! 🍪\n\n' +
        'Обери кількість зірочок для підтримки:',
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
};

// 2. Відправка інвойсу (рахунку) на оплату
export const handleStarsInvoice = async (ctx: Context) => {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    // Дістаємо кількість зірочок з callback_data (наприклад, з 'stars_50' дістанемо 50)
    const amount = parseInt(callbackData.split('_')[1], 10);

    await ctx.replyWithInvoice(
        'Підтримка SnackEnglish 🍪', // Назва
        `Дякуємо за вашу підтримку! Ви відправляєте ${amount} ⭐️.`, // Опис
        `support_${amount}_${ctx.from?.id}`, // Унікальний payload платежу
        'XTR', // Офіційний код валюти Telegram Stars
        [{ label: 'Зірочки', amount: amount }] // Для XTR 1 одиниця = 1 зірочка
    );
    await ctx.answerCallbackQuery();
};

// 3. Підтвердження перед чекаутом (Telegram вимагає цього для безпеки)
export const handlePreCheckout = async (ctx: Context) => {
    await ctx.answerPreCheckoutQuery(true);
};

// 4. Повідомлення про успішну оплату
export const handleSuccessfulPayment = async (ctx: Context) => {
    await ctx.reply(
        '🎉 *Величезне дякую за твою підтримку!*\n\n' +
        'Твої зірочки допомагають SnackEnglish ставати ще кращим! 🍪💖', 
        { parse_mode: 'Markdown' }
    );
};