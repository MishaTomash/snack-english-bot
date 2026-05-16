import { Word, IWord } from '../models/Word';

export const getRandomWords = async (level: string, limit: number = 5): Promise<IWord[]> => {
  // Використовуємо агрегацію MongoDB для випадкової вибірки ($sample)
  return await Word.aggregate([
    { $match: { level } },
    { $sample: { size: limit } }
  ]);
};