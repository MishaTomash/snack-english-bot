import { Word, IWord } from '../models/Word';
import { IUser, User } from '../models/User';
import { Types } from 'mongoose';

/**
 * Повертає `count` випадкових слів для користувача відповідно до його рівня.
 * Виключає вже переглянуті слова. Якщо всі переглянуті — скидає історію.
 */
export const getRandomWords = async (
  user: IUser,
  count: number = 5,
): Promise<IWord[]> => {
  // Нормалізуємо seenWords до Types.ObjectId[], щоб $nin працював коректно
  const seenIds = user.seenWords.map((id) => new Types.ObjectId(id.toString()));

  const buildPipeline = (excludeIds: Types.ObjectId[]) => [
    {
      $match: {
        level: user.level,
        ...(excludeIds.length > 0 && { _id: { $nin: excludeIds } }),
      },
    },
    { $sample: { size: count } },
  ];

  // 1. Шукаємо нові слова (яких користувач ще не бачив)
  let words: IWord[] = await Word.aggregate(buildPipeline(seenIds));

  const needsReset = words.length < count;

  // 2. Якщо всі слова переглянуто — скидаємо історію та беремо заново
  if (needsReset) {
    words = await Word.aggregate(buildPipeline([]));
  }

  if (words.length === 0) return [];

  const newWordIds = words.map((w) => new Types.ObjectId(w._id.toString()));

  // 3. $set і $push на одне поле в одному запиті — MongoDB помилка ConflictingUpdateOperators!
  //    Тому розбиваємо на два окремих запити залежно від needsReset
  if (needsReset) {
    await User.findByIdAndUpdate(user._id, {
      $set: { seenWords: newWordIds }, // Скидаємо і одразу записуємо нові
    });
  } else {
    await User.findByIdAndUpdate(user._id, {
      $push: {
        seenWords: {
          $each: newWordIds,
          $slice: -1000,
        },
      },
    });
  }

  return words;
};