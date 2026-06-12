import { Context, InlineKeyboard } from 'grammy';
import { Topic } from '../../models/Topic';
import { Word } from '../../models/Word';

// Тимчасова пам'ять для адмінів: telegramId -> topicId
export const adminTopicStates = new Map<number, string>();

// 1. Головне меню тем для Адміна
export const handleAdminTopicsMenu = async (ctx: Context) => {
  const topics = await Topic.find().lean();
  const keyboard = new InlineKeyboard();

  topics.forEach((t) => {
    keyboard.text(`${t.emoji} ${t.title}`, `adm_topic_${t._id}`).row();
  });
  
  keyboard.text('➕ Створити нову тему', 'adm_topic_new').row();

  const text = '📚 <b>Керування темами:</b>\nОбери тему, щоб додати до неї слова, або створи нову.';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => {});
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};

// 2. Відкриваємо конкретну тему
export const handleAdminTopicSelect = async (ctx: Context) => {
  const topicId = ctx.callbackQuery?.data?.replace('adm_topic_', '');
  if (!topicId) return;

  const topic = await Topic.findById(topicId).lean();
  if (!topic) return ctx.answerCallbackQuery('❌ Тему не знайдено');

  const wordsCount = await Word.countDocuments({ topicId });

  const keyboard = new InlineKeyboard()
    .text('➕ Додати слова сюди', `adm_addwords_${topicId}`).row()
    .text('🔙 Назад до тем', 'adm_topics_back');

  await ctx.editMessageText(
    `Тема: <b>${topic.emoji} ${topic.title}</b>\nСлів у базі: <b>${wordsCount}</b>\n\nЩо будемо робити?`,
    { parse_mode: 'HTML', reply_markup: keyboard }
  );
};

// 3. Натискання на "Додати слова сюди"
export const handleAdminAddWordsPrompt = async (ctx: Context) => {
  const topicId = ctx.callbackQuery?.data?.replace('adm_addwords_', '');
  const telegramId = ctx.from?.id;
  if (!topicId || !telegramId) return;

  // Вмикаємо "режим додавання" для цього адміна
  adminTopicStates.set(telegramId, topicId);

  await ctx.reply(
    `✍️ Надішли мені слова для цієї теми у форматі:\n\n` +
    `<code>cat | кішка | кет</code>\n\n` +
    `<i>💡 Можеш надіслати одразу багато слів, кожне з нового рядка!</i>\n\n` +
    `Щоб вийти з цього режиму, натисни /cancel_topic`,
    { parse_mode: 'HTML' }
  );
  await ctx.answerCallbackQuery();
};

// 4. Створення нової теми (підказка)
export const handleAdminTopicNew = async (ctx: Context) => {
  await ctx.reply('Щоб створити нову тему, надішли команду:\n<code>/new_topic Природа | 🌲</code>', { parse_mode: 'HTML' });
  await ctx.answerCallbackQuery();
};

export const createNewTopicCommand = async (ctx: Context) => {
  const text = ctx.message?.text?.replace('/new_topic', '').trim();
  if (!text) return ctx.reply('Формат: /new_topic Назва | Емодзі');
  
  const [title, emoji] = text.split('|').map(s => s.trim());
  await Topic.create({ title, emoji: emoji || '📚' });
  await ctx.reply(`✅ Тему "${title}" створено! Відкрий меню тем, щоб додати туди слова.`);
};