import { Context } from 'grammy';
import { User } from '../../models/User';
import { LabeledPrice } from "grammy/types";

export const sendPremiumOffer = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    // Перевіряємо, чи юзер вже має Premium
    const user = await User.findOne({ telegramId });
    if (user?.isPremium) {
        if (ctx.callbackQuery) await ctx.answerCallbackQuery();
        return await ctx.reply('✨ У тебе вже активовано **Premium**! Насолоджуйся навчанням без обмежень 🚀', { parse_mode: 'Markdown' });
    }

    // Закриваємо callback, якщо користувач натиснув кнопку "💎 Отримати Premium" у лімітах
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();

    const title = 'SnackEnglish Premium 💎';
    const description = 'Необмежене навчання (без денних лімітів), озвучка, складні тексти та розширена статистика!';
    const payload = 'premium_subscription';
    const providerToken = ''; // ⭐️ Для Telegram Зірок токен МАЄ бути порожнім!
    const currency = 'XTR' as any; // ⭐️ Валюта - Telegram Stars
    const prices: LabeledPrice[] = [ 
        { label: "SnackEnglish Premium", amount: 1 }
    ];    // Відправляємо нативний рахунок Telegram
await ctx.replyWithInvoice(
    title,
    description,
    payload,
    currency,
    prices,
    {
        provider_token: providerToken,
    }
);
};

// Обробка запиту перед оплатою (обов'язковий крок Telegram)
export const handlePreCheckoutQuery = async (ctx: Context) => {
    // Підтверджуємо, що ми готові провести платіж
    await ctx.answerPreCheckoutQuery(true).catch(console.error);
};

// Обробка успішної оплати
export const handleSuccessfulPayment = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    // Надаємо статус Premium у базі даних
    await User.findOneAndUpdate({ telegramId }, { isPremium: true });

    await ctx.reply(
        '🎉 **Вітаємо! Оплата успішна!**\n\nТвій акаунт оновлено до **Premium**! 💎\nДякуємо за підтримку. Зайди в "Мій профіль", щоб перевірити свій новий статус.',
        { parse_mode: 'Markdown' }
    );
};