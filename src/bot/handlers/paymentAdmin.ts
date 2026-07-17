import { Context, InlineKeyboard } from 'grammy';
import { config } from '../../config';
import { getPaymentMode, setPaymentMode } from '../../services/paymentModeService';

const isAdmin = (ctx: Context): boolean => ctx.from?.id === config.ADMIN_ID;

const modeLabel = (mode: string) => (mode === 'card' ? '💳 Картка + Stars' : '🏦 Банка (донат)');

export const handleAdminPaymentModeMenu = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;

  const mode = await getPaymentMode();

  const text =
    `💳 <b>Спосіб оплати Premium</b>\n\n` +
    `Поточний режим: <b>${modeLabel(mode)}</b>\n\n` +
    `Обери новий режим нижче 👇`;

  const keyboard = new InlineKeyboard()
    .text(`${mode === 'card' ? '✅' : '💳'} Картка + Stars`, 'set_payment_card').row()
    .text(`${mode === 'jar' ? '✅' : '🏦'} Банка (донат)`, 'set_payment_jar');

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
};

export const handleSetPaymentMode = async (ctx: Context) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const mode = ctx.callbackQuery?.data === 'set_payment_jar' ? 'jar' : 'card';
  await setPaymentMode(mode);

  await ctx
    .editMessageText(`✅ Режим оплати змінено на: <b>${modeLabel(mode)}</b>`, { parse_mode: 'HTML' })
    .catch(() => {});
};