import { SentenceExercise, ISentenceExercise } from '../models/SentenceExercise';

export const getRandomSentence = async (
  seenIds: any[],
  level?: string
): Promise<ISentenceExercise | null> => {
  const levelOrder: Record<string, string[]> = {
    A1: ['A1'],
    A2: ['A2', 'A1'],
    B1: ['B1', 'A2', 'A1'],
    B2: ['B2', 'B1', 'A2'],
    C1: ['C1', 'B2', 'B1'],
    C2: ['C2', 'C1', 'B2'],
  };

  // Рівні для пошуку: свій + нижчі (щоб не було порожньо)
  const allowedLevels = level && levelOrder[level] ? levelOrder[level] : null;

  const baseFilter: any = { isActive: true };
  if (allowedLevels) baseFilter.level = { $in: allowedLevels };

  // Шукаємо не переглянуте
  let sentence = await SentenceExercise.findOne({
    ...baseFilter,
    _id: { $nin: seenIds },
  });

  // Якщо всі переглянуті — починаємо заново (без фільтра seenIds)
  if (!sentence) {
    sentence = await SentenceExercise.findOne(baseFilter);
  }

  // Якщо для цього рівня взагалі немає — будь-яке
  if (!sentence) {
    sentence = await SentenceExercise.findOne({ isActive: true, _id: { $nin: seenIds } });
  }

  return sentence;
};

export const shuffleWords = (words: string[]): string[] => {
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};