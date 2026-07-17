import { ChatLog } from '../../models/ChatLog';
import { User } from '../../models/User';

export const logChatMessage = async (
  telegramId: number,
  role: 'user' | 'assistant',
  content: string
) => {
  try {
    await ChatLog.create({ telegramId, role, content });
  } catch (err) {
    console.error('❌ Помилка збереження логу чату:', err);
  }
};

export interface ChatLogUserSummary {
  telegramId: number;
  displayName: string;
  messageCount: number;
  lastMessageAt: Date;
}

const PAGE_SIZE = 8;

export const getChatLogUsers = async (
  page: number = 0
): Promise<{ users: ChatLogUserSummary[]; hasMore: boolean }> => {
  const grouped = await ChatLog.aggregate([
    { $group: { _id: '$telegramId', messageCount: { $sum: 1 }, lastMessageAt: { $max: '$createdAt' } } },
    { $sort: { lastMessageAt: -1 } },
    { $skip: page * PAGE_SIZE },
    { $limit: PAGE_SIZE + 1 },
  ]);

  const hasMore = grouped.length > PAGE_SIZE;
  const pageItems = grouped.slice(0, PAGE_SIZE);

  const users: ChatLogUserSummary[] = await Promise.all(
    pageItems.map(async (item) => {
      // ⚠️ Заміни user.firstName / user.username на реальні поля твоєї моделі User,
      // якщо вони називаються інакше
      const user = await User.findOne({ telegramId: item._id });
      const displayName =
        (user as any)?.username ? `@${(user as any).username}` : `ID ${item._id}`;

      return {
        telegramId: item._id,
        displayName,
        messageCount: item.messageCount,
        lastMessageAt: item.lastMessageAt,
      };
    })
  );

  return { users, hasMore };
};

export const getUserTranscript = async (
  telegramId: number
): Promise<{ role: string; content: string }[]> => {
  const logs = await ChatLog.find({ telegramId }).sort({ createdAt: 1 }).lean();
  return logs.map(l => ({ role: l.role, content: l.content }));
};