import { ConversationManager } from './conversationManager';
import { ChatTopic } from './topics';

interface UserChatState {
  conversation: ConversationManager;
  topic: ChatTopic;
  level: string;
  queue: Promise<void>;
}

const activeSessions = new Map<number, UserChatState>();

export const startSession = (telegramId: number, topic: ChatTopic, level: string) => {
  activeSessions.set(telegramId, {
    conversation: new ConversationManager(),
    topic,
    level,
    queue: Promise.resolve(),
  });
};

export const getSession = (telegramId: number): UserChatState | undefined => {
  return activeSessions.get(telegramId);
};

export const endSession = (telegramId: number) => {
  activeSessions.delete(telegramId);
};


export const enqueue = <T>(telegramId: number, task: () => Promise<T>): Promise<T> => {
  const session = activeSessions.get(telegramId);
  if (!session) return task();

  const result = session.queue.then(task, task);
  session.queue = result.then(() => undefined, () => undefined);
  return result;
};