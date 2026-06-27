import { SentenceExercise, ISentenceExercise } from '../models/SentenceExercise';

/**
 * Повертає випадкове речення, яке юзер ще не бачив.
 * Якщо всі переглянуті — скидає і починає заново.
 */
export const getRandomSentence = async (
  seenIds: any[]
): Promise<ISentenceExercise | null> => {
  // Спочатку шукаємо не переглянуте
  let sentence = await SentenceExercise.findOne({
    isActive: true,
    _id: { $nin: seenIds },
  });

  // Якщо всі переглянуті — даємо будь-яке (починаємо заново)
  if (!sentence) {
    sentence = await SentenceExercise.findOne({ isActive: true });
  }

  return sentence;
};

/**
 * Перемішує масив слів (Fisher-Yates).
 * Використовується для розбивки речення на кнопки.
 */
export const shuffleWords = (words: string[]): string[] => {
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};