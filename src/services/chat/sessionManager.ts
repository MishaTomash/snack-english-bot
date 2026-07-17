import { ConversationManager } from './conversationManager';
import { ChatTopic } from './topics';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 хв

interface UserChatState {
  conversation: ConversationManager;
  topic: ChatTopic;
  level: string;
  persona: string;
  queue: Promise<void>;
  timeoutHandle: NodeJS.Timeout;
  lastStyle: string | null;          // ← НОВЕ
  lastEndedWithQuestion: boolean;    // ← НОВЕ
}

const activeSessions = new Map<number, UserChatState>();

// Колбек, який виконується при бездіяльності — реєструється handler-файлом ззовні,
// щоб sessionManager не залежав від Api/ChatSession напряму.
let inactivityHandler: ((telegramId: number) => void) | null = null;

export const registerInactivityHandler = (handler: (telegramId: number) => void) => {
  inactivityHandler = handler;
};

const scheduleTimeout = (telegramId: number): NodeJS.Timeout => {
  return setTimeout(() => {
    activeSessions.delete(telegramId);
    inactivityHandler?.(telegramId);
  }, INACTIVITY_TIMEOUT_MS);
};

export const startSession = (
  telegramId: number,
  topic: ChatTopic,
  level: string,
  persona: string
) => {
  const existing = activeSessions.get(telegramId);
  if (existing) clearTimeout(existing.timeoutHandle);

  activeSessions.set(telegramId, {
    conversation: new ConversationManager(),
    topic,
    level,
    persona,
    queue: Promise.resolve(),
    timeoutHandle: scheduleTimeout(telegramId),
    lastStyle: null,               // ← НОВЕ
    lastEndedWithQuestion: false,  // ← НОВЕ
  });
};

export const getSession = (telegramId: number): UserChatState | undefined => {
  return activeSessions.get(telegramId);
};

/** Скидає таймер бездіяльності — викликати при кожній активності користувача. */
export const touchSession = (telegramId: number) => {
  const session = activeSessions.get(telegramId);
  if (!session) return;

  clearTimeout(session.timeoutHandle);
  session.timeoutHandle = scheduleTimeout(telegramId);
};

export const endSession = (telegramId: number) => {
  const session = activeSessions.get(telegramId);
  if (session) clearTimeout(session.timeoutHandle);
  activeSessions.delete(telegramId);
};

export const enqueue = <T>(telegramId: number, task: () => Promise<T>): Promise<T> => {
  const session = activeSessions.get(telegramId);
  if (!session) return task();

  const result = session.queue.then(task, task);
  session.queue = result.then(() => undefined, () => undefined);
  return result;
};