import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { TopCycle } from '../../models/TopCycle';
import { config } from '../../config';
import { LabeledPrice } from 'grammy/types';

// ─── 1. ГОЛОВНЕ МЕНЮ PREMIUM (Вибір способу) ──────────────────────────────
export const sendPremiumMenu = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await User.findOne({ telegramId });
  if (user?.isPremium) {
    return ctx.reply(
      '✨ У тебе вже активовано **Premium**! Насолоджуйся навчанням без обмежень 🚀',
      { parse_mode: 'Markdown' }
    );
  }

  const text = `
💎 *SnackEnglish Premium*

Безлім слів, курси + тести, більше хр,  і ніхто не скаже «ти сьогодні все вивчив, йди геть».

Обери варіант:

💳 *Картка (Mono/Приват)* — 40 грн (без комісій)
⭐ *Telegram Stars* — 75 ★ (комісія Apple/Telegram, тому дорожче)

🎁 *Халява*: запроси 3 друзів → Premium безкоштовно.
  `;

  const keyboard = new InlineKeyboard()
    .text('💳 40 грн (картка)', 'pay_card')
    .row()
    .text('⭐ 75 ★ (Stars)', 'pay_stars')
    .row()
    .text('👥 Запросити друзів (безкоштовно)', 'pay_referral');

  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// ─── 2. ЛОГІКА ОПЛАТИ НА КАРТКУ (Монобанк) ─────────────────────────────────
export const sendCardPremiumOffer = async (ctx: Context) => {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const orderId = `P-${telegramId.toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`;
  const cardNumber = '4441 1111 5819 5697'; // ⚠️ ТУТ ВПИШИ СВІЙ НОМЕР

  const text = `
💳 *Оплата на картку*

Вартість: *40 грн*
Перекажи кошти на картку Монобанку:
\`${cardNumber}\` (натисни, щоб скопіювати)

⚠️ *ОБОВ'ЯЗКОВО* вкажи цей код у коментарі:
\`${orderId}\`

Після переказу натисни кнопку нижче 👇
  `;

  const keyboard = new InlineKeyboard().text('✅ Я оплатив', `paid_prem_${orderId}`);
  // Змінюємо попереднє повідомлення на реквізити
  await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// Адмінські обробники для картки (ті самі, що ми робили)
export const handlePaidButton = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  // Дістаємо юзернейм або хоча б ім'я, якщо юзернейму немає
  const username = ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name || `Без імені`);
  const orderId = ctx.callbackQuery?.data?.replace('paid_prem_', '');

  if (!telegramId || !orderId) return;

  await ctx.answerCallbackQuery('Заявку відправлено на перевірку!');

  // Юзеру відправляємо як було (тут немає небезпечних змінних)
  await ctx.editMessageText('⏳ *Заявку відправлено!*\n\nОчікуємо підтвердження від адміністратора.', { parse_mode: 'Markdown' });

  // ⚠️ ВИПРАВЛЕННЯ: Для адмін-панелі використовуємо HTML-теги <b> та <code>
  const adminText = `
💰 <b>Нова заявка на Premium!</b>
Юзер: ${username} (ID: <code>${telegramId}</code>)
Коментар: <code>${orderId}</code>
Сума: <b>40 грн</b>

Перевір Монобанк.
  `;

  const adminKeyboard = new InlineKeyboard()
    .text('✅ Підтвердити', `approve_prem_${telegramId}`)
    .text('❌ Відхилити', `reject_prem_${telegramId}`);

  // ⚠️ ВИПРАВЛЕННЯ: parse_mode тепер 'HTML'
  await ctx.api.sendMessage(config.ADMIN_ID, adminText, {
    parse_mode: 'HTML',
    reply_markup: adminKeyboard
  });
};

export const handlePremiumApproval = async (ctx: Context) => {
  const targetUserId = Number(ctx.callbackQuery?.data?.replace('approve_prem_', ''));
  if (!targetUserId) return;

  await grantPremium(targetUserId, 30);

  await ctx.api.sendMessage(targetUserId, `🎉 *Вітаємо! Оплата успішна!*\n\n💎 Твій статус *Premium* активовано! 🚀`, { parse_mode: 'Markdown' });

  // Оновлюємо адмінське повідомлення з HTML
  await ctx.editMessageText(`✅ <b>Оплату ПІДТВЕРДЖЕНО</b> для ID: <code>${targetUserId}</code>`, { parse_mode: 'HTML' });
  await ctx.answerCallbackQuery('Підтверджено!');
};

export const handlePremiumRejection = async (ctx: Context) => {
  const targetUserId = Number(ctx.callbackQuery?.data?.replace('reject_prem_', ''));
  if (!targetUserId) return;

  await ctx.api.sendMessage(targetUserId, `❌ *Оплату не знайдено!*\nЗвернися до підтримки з квитанцією.`, { parse_mode: 'Markdown' });

  // Оновлюємо адмінське повідомлення з HTML
  await ctx.editMessageText(`❌ <b>Оплату ВІДХИЛЕНО</b> для ID: <code>${targetUserId}</code>`, { parse_mode: 'HTML' });
  await ctx.answerCallbackQuery('Відхилено!');
};

// ─── 3. ЛОГІКА ОПЛАТИ TELEGRAM STARS ───────────────────────────────────────
export const sendStarsInvoice = async (ctx: Context) => {
  await ctx.answerCallbackQuery();

  const title = 'SnackEnglish Premium 💎';
  const description = 'Необмежене навчання, озвучка, складні тексти та статистика (Оплата Зірками)';
  const payload = 'premium_subscription_stars';
  const providerToken = ''; // Для зірок токен порожній
  const currency = 'XTR' as any;
  const prices: LabeledPrice[] = [{ label: 'Premium', amount: 75 }]; // 75 зірок

  await ctx.replyWithInvoice(title, description, payload, currency, prices, {
    provider_token: providerToken,
  });
};

export const handlePreCheckoutQuery = async (ctx: Context) => {
  await ctx.answerPreCheckoutQuery(true).catch(console.error);
};

export const handleStarsPaymentSuccess = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  await grantPremium(telegramId, 30); // Нараховуємо преміум
  await ctx.reply(`🎉 *Вітаємо!*\n\nОплата Зірками пройшла успішно! 💎 Твій статус *Premium* активовано! 🚀`, { parse_mode: 'Markdown' });
};

// ─── ВИПРАВЛЕНА grantPremium ──────────────────────────────────────────────
const grantPremium = async (telegramId: number, days: number = 30) => {
  // Рахуємо дату закінчення відносно ЗАРАЗ, не від топ-циклу
  const premiumExpiresAt = new Date();
  premiumExpiresAt.setDate(premiumExpiresAt.getDate() + days);

  await User.findOneAndUpdate(
    { telegramId },
    { isPremium: true, premiumExpiresAt }
  );
};