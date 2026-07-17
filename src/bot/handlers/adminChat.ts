import { Context, InlineKeyboard } from 'grammy';
import { config } from '../../config';
import { getChatLogUsers, getUserTranscript } from '../../services/chat/chatLogger';

const isAdmin = (telegramId: number | undefined): boolean => {
  return !!telegramId && telegramId === config.ADMIN_ID;
};

const buildUsersKeyboard = (
  users: Awaited<ReturnType<typeof getChatLogUsers>>['users'],
  page: number,
  hasMore: boolean
) => {
  const keyboard = new InlineKeyboard();

  users.forEach(u => {
    keyboard.text(`${u.displayName} (${u.messageCount} msg)`, `statuschat_user_${u.telegramId}_${page}`).row();
  });

  if (page > 0) keyboard.text('◀️ Назад', `statuschat_page_${page - 1}`);
  if (hasMore) keyboard.text('▶️ Далі', `statuschat_page_${page + 1}`);

  return keyboard;
};

export const handleStatusChatCommand = async (ctx: Context) => {
  if (!isAdmin(ctx.from?.id)) return;

  const { users, hasMore } = await getChatLogUsers(0);

  if (users.length === 0) {
    await ctx.reply('Поки що ніхто не пробував Чатік.');
    return;
  }

  await ctx.reply('👥 Користувачі, які пробували Чатік:', {
    reply_markup: buildUsersKeyboard(users, 0, hasMore),
  });
};

export const handleStatusChatPageCallback = async (ctx: Context) => {
  const data = ctx.callbackQuery?.data;
  if (!isAdmin(ctx.from?.id) || !data) return;

  const page = parseInt(data.replace('statuschat_page_', ''), 10);
  const { users, hasMore } = await getChatLogUsers(page);

  await ctx.editMessageReplyMarkup({ reply_markup: buildUsersKeyboard(users, page, hasMore) });
  await ctx.answerCallbackQuery();
};

const MAX_CHUNK_LENGTH = 3500; // запас під ліміт Telegram 4096 символів

const chunkTranscript = (text: string): string[] => {
  const chunks: string[] = [];
  let current = '';

  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > MAX_CHUNK_LENGTH) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);

  return chunks;
};

export const handleStatusChatUserCallback = async (ctx: Context) => {
  const data = ctx.callbackQuery?.data;
  if (!isAdmin(ctx.from?.id) || !data) return;

  const match = data.match(/^statuschat_user_(\d+)_(\d+)$/);
  if (!match) return;

  const telegramId = Number(match[1]);
  const backPage = Number(match[2]);

  await ctx.answerCallbackQuery();

  const transcript = await getUserTranscript(telegramId);

  if (transcript.length === 0) {
    await ctx.reply('Немає збережених повідомлень для цього користувача.');
    return;
  }

  const formatted = transcript
    .map(t => `${t.role === 'assistant' ? 'Бот' : 'Юзер'}: ${t.content}`)
    .join('\n\n');

  const chunks = chunkTranscript(formatted);

  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }

  const backKeyboard = new InlineKeyboard().text('🔙 До списку', `statuschat_page_${backPage}`);
  await ctx.reply(`📄 Кінець переписки (telegramId: ${telegramId})`, { reply_markup: backKeyboard });
};