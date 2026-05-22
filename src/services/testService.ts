import { TestQuestion, ITestQuestion } from '../models/TestQuestion';
import { IUser, User } from '../models/User';
import { Types } from 'mongoose';

/**
 * Випадковий загальний тест для рівня юзера (якого ще не бачив).
 * Видає ТІЛЬКИ ті тести, які НЕ прив'язані до конкретних слів (wordId: null).
 */
export const getRandomTest = async (user: IUser): Promise<ITestQuestion | null> => {
  const seenIds = user.seenTests.map((id) => new Types.ObjectId(id.toString()));

  const buildPipeline = (excludeIds: Types.ObjectId[]) => [
    {
      $match: {
        level: user.level,
        wordId: null, // 👈 ОСЬ ГОЛОВНЕ ВИПРАВЛЕННЯ: беремо тільки загальні тести
        ...(excludeIds.length > 0 && { _id: { $nin: excludeIds } }),
      },
    },
    { $sample: { size: 1 } },
  ];

  let tests: ITestQuestion[] = await TestQuestion.aggregate(buildPipeline(seenIds));
  const needsReset = tests.length === 0;

  if (needsReset) {
    tests = await TestQuestion.aggregate(buildPipeline([]));
  }
  if (tests.length === 0) return null;

  const testId = new Types.ObjectId(tests[0]._id.toString());

  if (needsReset) {
    await User.findByIdAndUpdate(user._id, { $set: { seenTests: [testId] } });
  } else {
    await User.findByIdAndUpdate(user._id, {
      $push: { seenTests: { $each: [testId], $slice: -500 } },
    });
  }

  return tests[0];
};

/**
 * Отримує наступний тест до вивчених слів юзера.
 */
export const getTestForLearnedWords = async (
  user: IUser,
): Promise<{ test: ITestQuestion; isRepeat: boolean } | null> => {
  if (!user.seenWords || user.seenWords.length === 0) return null;

  const wordIds = user.seenWords.map((id) => new Types.ObjectId(id.toString()));

  // Скільки взагалі є тестів до цих слів
  const totalCount = await TestQuestion.countDocuments({ wordId: { $in: wordIds } });
  if (totalCount === 0) return null;

  const seenIds = (user.seenLearnedTests ?? []).map(
    (id) => new Types.ObjectId(id.toString()),
  );

  // Шукаємо тест якого ще не бачив
  const newTests = await TestQuestion.aggregate([
    {
      $match: {
        wordId: { $in: wordIds },
        ...(seenIds.length > 0 ? { _id: { $nin: seenIds } } : {}),
      },
    },
    { $sample: { size: 1 } },
  ]);

  if (newTests.length > 0) {
    // Є новий — записуємо в seen і повертаємо
    const testId = new Types.ObjectId(newTests[0]._id.toString());
    await User.findByIdAndUpdate(user._id, {
      $push: { seenLearnedTests: { $each: [testId], $slice: -500 } },
    });
    return { test: newTests[0], isRepeat: false };
  }

  // Всі пройдено — повертаємо isRepeat: true БЕЗ запису в seen
  // (просто беремо будь-який щоб показати екран завершення)
  const anyTest = await TestQuestion.aggregate([
    { $match: { wordId: { $in: wordIds } } },
    { $sample: { size: 1 } },
  ]);

  return { test: anyTest[0], isRepeat: true };
};

/**
 * Тест прив'язаний до конкретного слова (wordId). Режим повторення.
 */
export const resetAndGetLearnedTest = async (
  user: IUser,
): Promise<ITestQuestion | null> => {
  if (!user.seenWords || user.seenWords.length === 0) return null;

  const wordIds = user.seenWords.map((id) => new Types.ObjectId(id.toString()));

  const tests = await TestQuestion.aggregate([
    { $match: { wordId: { $in: wordIds } } },
    { $sample: { size: 1 } },
  ]);

  if (tests.length === 0) return null;

  const testId = new Types.ObjectId(tests[0]._id.toString());

  // Скидаємо всю історію і одразу записуємо перший тест
  await User.findByIdAndUpdate(user._id, {
    $set: { seenLearnedTests: [testId] },
  });

  return tests[0];
};