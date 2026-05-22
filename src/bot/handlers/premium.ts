import { Context } from 'grammy';
import { User } from '../../models/User';
import { LabeledPrice } from 'grammy/types';
import { TopCycle } from '../../models/TopCycle';

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

export const handlePremiumPaymentSuccess = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // Отримуємо поточний сезон
  let activeCycle = await TopCycle.findOne({ isActive: true });
  if (!activeCycle) {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    activeCycle = await TopCycle.create({ endDate: defaultDate, seasonNumber: 1 });
  }

  await User.findOneAndUpdate(
    { telegramId },
    {
      isPremium: true,
      premiumExpiresAt: activeCycle.endDate,
    },
  );

  const formattedDate = activeCycle.endDate.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });

  await ctx.reply(
    `🎉 *Вітаємо! Оплата успішна!*\n\n` +
    `💎 Твій статус *Premium* активовано! Він діятиме до кінця поточного сезону ТОПу (*${formattedDate}*).\n\n` +
    `Змагайся за призи та досягай нових висот! 🚀`,
    { parse_mode: 'Markdown' },
  );
};