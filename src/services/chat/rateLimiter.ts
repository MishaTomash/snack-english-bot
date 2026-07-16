import { User } from '../../models/User';

export const FREE_CHAT_MESSAGES_LIMIT = 8; // легко змінити через конфіг пізніше
const COOLDOWN_MS = 2000;
const MAX_MESSAGE_LENGTH = 300;

const lastMessageAt = new Map<number, number>();

export const isOnCooldown = (telegramId: number): boolean => {
  const last = lastMessageAt.get(telegramId) || 0;
  return Date.now() - last < COOLDOWN_MS;
};

export const registerMessageTime = (telegramId: number) => {
  lastMessageAt.set(telegramId, Date.now());
};

export const isMessageTooLong = (text: string): boolean => text.length > MAX_MESSAGE_LENGTH;

const SUSPICIOUS_PATTERNS = [
  /```/,
  /function\s*\(/i,
  /import\s+.+from/i,
  /select\s+.+from/i,
  /write\s+(a\s+)?(code|program|essay|story|poem)/i,
  /ignore\s+(previous|all)\s+instructions/i,
];

export const isSuspiciousMessage = (text: string): boolean =>
  SUSPICIOUS_PATTERNS.some(pattern => pattern.test(text));

export const canSendChatMessage = async (
  telegramId: number
): Promise<{ allowed: boolean; isPremium: boolean }> => {
  const user = await User.findOne({ telegramId });
  if (!user) return { allowed: true, isPremium: false };

  if (user.isPremium) {
    return { allowed: true, isPremium: true };
  }

  const now = new Date();
  const lastMsg = user.lastChatMessageDate || new Date(0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastMsgDay = new Date(lastMsg.getFullYear(), lastMsg.getMonth(), lastMsg.getDate());

  if (today.getTime() > lastMsgDay.getTime()) {
    user.chatMessagesToday = 0;
    await user.save();
  }

  return { allowed: user.chatMessagesToday < FREE_CHAT_MESSAGES_LIMIT, isPremium: false };
};

export const incrementChatMessageCount = async (telegramId: number) => {
  await User.findOneAndUpdate(
    { telegramId },
    { $inc: { chatMessagesToday: 1 }, $set: { lastChatMessageDate: new Date() } }
  );
};