import { Bot } from 'grammy';
import { handlePreCheckoutQuery, handleStarsPaymentSuccess } from '../handlers/premium';
import { handleSuccessfulPayment } from '../handlers/support';

export const registerPayments = (bot: Bot) => {
  bot.on('pre_checkout_query', handlePreCheckoutQuery);

  bot.on('message:successful_payment', async (ctx) => {
    const payload = ctx.message?.successful_payment?.invoice_payload ?? '';
    if (payload === 'premium_subscription_stars') {
      await handleStarsPaymentSuccess(ctx);
    } else {
      await handleSuccessfulPayment(ctx);
    }
  });
};