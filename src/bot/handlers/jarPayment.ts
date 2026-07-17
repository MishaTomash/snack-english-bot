import { Context, InlineKeyboard } from 'grammy';
import { config } from '../../config';

const JAR_URL = 'https://send.monobank.ua/jar/2JbpBYkhMv';

// telegramId → orderId, для кого зараз очікується скріншот
export const pendingJarPayments = new Map<number, string>();

export const sendJarPremiumOffer = async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const orderId = `J-${telegramId.toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`;

  const text = `
🏦 *Підтримка проєкту*

Задонать будь-яку суму (рекомендовано *40 грн*) на банку проєкту:
${JAR_URL}

Після донату надішли сюди *скріншот* підтвердження і натисни кнопку нижче 👇
  `;

  const keyboard = new InlineKeyboard().text('✅ Я задонатив, надсилаю скрін', `jar_paid_${orderId}`);
  await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
};

export const handleJarPaidButton = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const orderId = ctx.callbackQuery?.data?.replace('jar_paid_', '');
  if (!telegramId || !orderId) return;

  pendingJarPayments.set(telegramId, orderId);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText('📸 Надішли, будь ласка, скріншот донату одним фото-повідомленням.');
};

/**
 * Обробляє фото, якщо юзер зараз "на паузі очікування скріну".
 * Якщо не в цьому стані — пропускає далі (next()), щоб не заважати іншим photo-хендлерам.
 */
export const handleJarScreenshot = async (ctx: Context, next: () => Promise<void>) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  const orderId = pendingJarPayments.get(telegramId);
  if (!orderId) return next();

  const photo = ctx.message?.photo;
  if (!photo || photo.length === 0) return next();

  pendingJarPayments.delete(telegramId);

  const username = ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name || 'Без імені');
  const largestPhoto = photo[photo.length - 1];

  await ctx.reply('⏳ Скрін відправлено на перевірку адміністратору. Очікуй підтвердження!');

  const adminCaption =
    `🏦 <b>Новий донат на банку!</b>\n` +
    `Юзер: ${username} (ID: <code>${telegramId}</code>)\n` +
    `Заявка: <code>${orderId}</code>`;

  const adminKeyboard = new InlineKeyboard()
    .text('✅ Підтвердити', `approve_prem_${telegramId}`)
    .text('❌ Відхилити', `reject_prem_${telegramId}`);

  await ctx.api.sendPhoto(config.ADMIN_ID, largestPhoto.file_id, {
    caption: adminCaption,
    parse_mode: 'HTML',
    reply_markup: adminKeyboard,
  });
};