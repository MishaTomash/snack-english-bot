import { Context } from 'grammy';
import { User } from '../../models/User';
import { LabeledPrice } from 'grammy/types';

export const sendPremiumOffer = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await User.findOne({ telegramId });
  if (user?.isPremium) {
    if (ctx.callbackQuery) await ctx.answerCallbackQuery();
    return ctx.reply(
      '✨ У тебе вже активовано **Premium**! Насолоджуйся навчанням без обмежень 🚀',
      { parse_mode: 'Markdown' },
    );
  }

  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  const title        = 'SnackEnglish Premium 💎';
  const description  = 'Необмежене навчання (без денних лімітів), озвучка, складні тексти та розширена статистика!';
  const payload      = 'premium_subscription';
  const providerToken = '';
  const currency     = 'XTR' as any;
  const prices: LabeledPrice[] = [{ label: 'SnackEnglish Premium', amount: 1 }];

  await ctx.replyWithInvoice(title, description, payload, currency, prices, {
    provider_token: providerToken,
  });
};

export const handlePreCheckoutQuery = async (ctx: Context) => {
  await ctx.answerPreCheckoutQuery(true).catch(console.error);
};

// 👇 ОСЬ ТУТ ВИПРАВЛЕНО НАЗВУ ФУНКЦІЇ
export const handlePremiumPaymentSuccess = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);

  await User.findOneAndUpdate(
    { telegramId },
    {
      isPremium:        true,
      premiumExpiresAt: expirationDate,
    },
  );

  await ctx.reply(
    `🎉 *Вітаємо! Оплата успішна!*\n\n` +
    `💎 Твій статус *Premium* успішно активовано на 30 днів! Тепер тобі доступні всі функції без обмежень.\n\n` +
    `Дякуємо за підтримку проєкту! 🚀`,
    { parse_mode: 'Markdown' },
  );
};