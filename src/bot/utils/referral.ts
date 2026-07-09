import { InlineKeyboard } from 'grammy';

export interface ReferralShareMessage {
  text: string;
  keyboard: InlineKeyboard;
}

// 🔗 Генерує диплінк-запрошення на конкретного юзера
export const buildReferralLink = (botUsername: string, telegramId: number): string =>
  `https://t.me/${botUsername}?start=ref_${telegramId}`;

// 📝 Текст, який підставиться в діалог "Переслати/Поділитись" у Telegram (Повідомлення для друзів)
export const buildShareText = (): string =>
  `🔥 Бро, зайди на хвилину 😄\n` +
  `Тут англійська без нудятини, а ще за навчання можна виграти Telegram-стікери 🎁`;
  // (Посилання підставиться автоматично через Telegram API)

// 🔘 URL, який відкриває нативний діалог "Поділитися" в Telegram з готовим текстом і посиланням
export const buildTelegramShareUrl = (link: string, shareText: string): string =>
  `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

// 📦 Повне "ланцюгове" повідомлення: текст + кнопка "Запросити друга"
export const buildReferralShareMessage = (
  botUsername: string,
  telegramId: number,
  messageText: string
): ReferralShareMessage => {
  const link = buildReferralLink(botUsername, telegramId);
  const shareUrl = buildTelegramShareUrl(link, buildShareText());

  // Кнопка тепер має назву з твого шаблону
  const keyboard = new InlineKeyboard().url('🔗 Запросити друга', shareUrl);

  return { text: messageText, keyboard };
};

// 💬 Текст розсилки / головного меню запрошень
export const buildDefaultChainText = (invited: number = 0): string =>
  `🔥 Є шанс забрати Premium 😏\n\n` +
  `Запроси 3 друзів — і відкриєш Premium у боті.\n` +
  `Після цього кожен новий друг = +200 XP до сезонного розіграшу. А XP можна заробляти ще й просто навчаючись.\n\n` +
  `🎁 За активність розігруємо Telegram-стікери та інші призи.\n\n` +
  `✅ Твої запрошення: ${invited}\n\n` + // Залишив лічильник, щоб юзер бачив прогрес
  `👇 Тисни кнопку та кидай друзям своє посилання.`;

// 🤖 Текст після переходу за посиланням (для нового юзера)
export const buildWelcomeReferredText = (inviterName: string): string =>
  `🔥 Красавчик, ти вже в темі 😎\n` +
  `Тебе запросив ${inviterName}.\n\n` +
  `Тепер можеш і сам отримати Premium:\n` +
  `🎁 Запроси 3 друзів — відкриєш Premium.\n` +
  `⭐ Далі кожен новий друг приносить +200 XP до розіграшу.\n\n` +
  `Ну і не забувай — просто навчаючись, теж можна вигравати Telegram-стікери та інші призи. 🚀\n\n` +
  `👇 Забирай своє посилання та клич друзів.`;