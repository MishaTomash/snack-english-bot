import { ConversationManager } from './conversationManager';
import { ChatTopic } from './topics';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 15 хвилин

interface UserChatState {
  conversation: ConversationManager;
  topic: ChatTopic;
  level: string;
  queue: Promise<void>;
  timeoutHandle: NodeJS.Timeout;
}

const activeSessions = new Map<number, UserChatState>();

let onInactivityTimeout: (telegramId: number) => void = () => {};

export const registerInactivityHandler = (handler: (telegramId: number) => void) => {
  onInactivityTimeout = handler;
};

const scheduleTimeout = (telegramId: number): NodeJS.Timeout => {
  return setTimeout(() => {
    activeSessions.delete(telegramId);
    onInactivityTimeout(telegramId);
  }, INACTIVITY_TIMEOUT_MS);
};

export const startSession = (telegramId: number, topic: ChatTopic, level: string) => {
  // якщо стара сесія була — прибираємо її таймер
  const existing = activeSessions.get(telegramId);
  if (existing) clearTimeout(existing.timeoutHandle);

  activeSessions.set(telegramId, {
    conversation: new ConversationManager(),
    topic,
    level,
    queue: Promise.resolve(),
    timeoutHandle: scheduleTimeout(telegramId),
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