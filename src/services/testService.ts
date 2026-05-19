import { TestQuestion, ITestQuestion } from '../models/TestQuestion';
import { IUser, User } from '../models/User';
import { Types } from 'mongoose';

/**
 * Повертає випадковий тест для користувача, якого він ще не бачив.
 * Якщо всі тести пройдено — скидає історію і починає заново.
 */
export const getRandomTest = async (user: IUser): Promise<ITestQuestion | null> => {
  const seenIds = user.seenTests.map((id) => new Types.ObjectId(id.toString()));

  const buildPipeline = (excludeIds: Types.ObjectId[]) => [
    {
      $match: {
        level: user.level,
        ...(excludeIds.length > 0 && { _id: { $nin: excludeIds } }),
      },
    },
    { $sample: { size: 1 } },
  ];

  // 1. Шукаємо тест якого ще не бачив
  let tests: ITestQuestion[] = await TestQuestion.aggregate(buildPipeline(seenIds));

  const needsReset = tests.length === 0;

  // 2. Всі пройдено — скидаємо і беремо заново
  if (needsReset) {
    tests = await TestQuestion.aggregate(buildPipeline([]));
  }

  if (tests.length === 0) return null;

  const test = tests[0];

  const testId = new Types.ObjectId(tests[0]._id.toString());

  // 3. $set і $push на одне поле в одному запиті — MongoDB помилка ConflictingUpdateOperators!
  //    Тому розбиваємо на два окремих запити залежно від needsReset
  if (needsReset) {
    await User.findByIdAndUpdate(user._id, {
      $set: { seenTests: [testId] }, // Скидаємо і одразу записуємо перший
    });
  } else {
    await User.findByIdAndUpdate(user._id, {
      $push: {
        seenTests: {
          $each: [testId],
          $slice: -500,
        },
      },
    });
  }

  return tests[0];
};