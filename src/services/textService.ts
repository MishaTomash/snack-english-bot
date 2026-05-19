import { Text, IText } from '../models/Text';
import { IUser, User } from '../models/User';
import { Types } from 'mongoose';

/**
 * Повертає випадковий текст для читання, якого користувач ще не бачив.
 * Якщо всі тексти переглянуто — скидає історію і починає заново.
 */
export const getRandomText = async (user: IUser): Promise<IText | null> => {
  const seenIds = user.seenTexts.map((id) => new Types.ObjectId(id.toString()));

  const buildPipeline = (excludeIds: Types.ObjectId[]) => [
    {
      $match: {
        level: user.level,
        ...(excludeIds.length > 0 && { _id: { $nin: excludeIds } }),
      },
    },
    { $sample: { size: 1 } },
  ];

  // 1. Шукаємо текст якого ще не бачив
  let texts: IText[] = await Text.aggregate(buildPipeline(seenIds));

  const needsReset = texts.length === 0;

  // 2. Всі переглянуто — скидаємо і беремо заново
  if (needsReset) {
    texts = await Text.aggregate(buildPipeline([]));
  }

  if (texts.length === 0) return null;

  const text = texts[0];

  const textId = new Types.ObjectId(text._id.toString());

  // 3. $set і $push на одне поле в одному запиті — MongoDB помилка ConflictingUpdateOperators!
  //    Тому розбиваємо на два окремих запити залежно від needsReset
  if (needsReset) {
    await User.findByIdAndUpdate(user._id, {
      $set: { seenTexts: [textId] }, // Скидаємо і одразу записуємо перший
    });
  } else {
    await User.findByIdAndUpdate(user._id, {
      $push: {
        seenTexts: {
          $each: [textId],
          $slice: -500,
        },
      },
    });
  }

  return text;
};

/**
 * Отримати конкретний текст за ID (для повторного перегляду, перекладу тощо)
 */
export const getTextById = async (id: string): Promise<IText | null> => {
  return await Text.findById(id);
};