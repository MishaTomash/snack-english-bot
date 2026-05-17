import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';

export const sendPremiumOffer = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    
    // Якщо вже є Premium — не показуємо рекламу
    if (user?.isPremium) {
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();
        return await ctx.reply('✨ У тебе вже активовано **Premium**! Насолоджуйся навчанням без обмежень 🚀', { parse_mode: 'Markdown' });
    }

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
        .text('💳 Отримати Premium (DEV ТЕСТ)', 'buy_premium');

    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    await ctx.reply(message, { 
        reply_markup: keyboard, 
        parse_mode: 'Markdown' 
    });
};

// Обробка натискання на кнопку оплати (Тимчасова логіка для розробника)
export const handlePremiumPurchase = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    // Реально видаємо Premium користувачу в БД!
    await User.findOneAndUpdate({ telegramId }, { isPremium: true });

    await ctx.editMessageText(
        '🎉 **Вітаємо! Оплата успішна!**\n\nТвій акаунт оновлено до **Premium**! 💎\nЗайди в "Мій профіль", щоб перевірити свій новий статус.', 
        { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery('Premium успішно активовано!');
};