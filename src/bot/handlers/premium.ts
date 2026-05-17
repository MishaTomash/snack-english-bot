import { Context, InlineKeyboard } from 'grammy';

export const sendPremiumOffer = async (ctx: Context) => {
    const message = `💎 *SnackEnglish Premium*\n\n` +
                    `Відкрий для себе всі можливості бота та вивчай англійську без жодних обмежень!\n\n` +
                    `*Що ти отримаєш:*\n` +
                    `✅ Більше слів і фраз\n` +
                    `✅ Необмежене навчання (без денних лімітів)\n` +
                    `✅ Складніші тексти для перекладу\n` +
                    `✅ Розширена статистика\n` +
                    `✅ Додаткові тести\n` +
                    `✅ Озвучка англійських слів і речень\n\n` +
                    `Оформи підписку та зроби навчання ще ефективнішим! 🚀`;

    const keyboard = new InlineKeyboard()
        .text('💳 Оформити Premium (Демо)', 'buy_premium');

    await ctx.reply(message, { 
        reply_markup: keyboard, 
        parse_mode: 'Markdown' 
    });
};

// Заглушка для обробки натискання на кнопку оплати
export const handlePremiumPurchase = async (ctx: Context) => {
    await ctx.answerCallbackQuery({ 
        text: '🤩 Дякуємо за інтерес! Поки що проєкт у стадії розробки, тому оплата ще не підключена.', 
        show_alert: true 
    });
};