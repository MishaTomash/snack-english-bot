import { Context, NextFunction } from 'grammy';
import { ChatSession } from '../../models/ChatSession';
import { getSession, startSession } from '../../services/chat/sessionManager';
import { getTopicById, getRandomTopic } from '../../services/chat/topics';
import { User } from '../../models/User';
import { processChatMessage, handleChatVoice } from '../handlers/chat';
import { getRandomPersonality } from '../../services/chat/personas';


const EXIT_CHAT_TEXT = '❌ Завершити чат';
const STUB_BUTTONS = ['💡 Підказка', '📝 Перекласти'];

export const chatModeMiddleware = async (ctx: Context, next: NextFunction) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return next();

  if (ctx.callbackQuery) return next();

  const text = ctx.message?.text;

  if (text && (text === EXIT_CHAT_TEXT || STUB_BUTTONS.includes(text))) {
    return next();
  }

  const chatSession = await ChatSession.findOne({ telegramId, isActive: true });
  if (!chatSession) return next();

  if (!getSession(telegramId)) {
    const user = await User.findOne({ telegramId });
    const topic = getTopicById(chatSession.topic) || getRandomTopic();
    startSession(telegramId, topic, user?.level || 'A2', getRandomPersonality()); // ← оновлено
  }

  if (ctx.message?.voice) {
    await handleChatVoice(ctx);
    return;
  }

  if (text) {
    await processChatMessage(ctx, telegramId, text);
    return;
  }

};