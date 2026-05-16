import { TestQuestion } from '../models/TestQuestion';

export const getRandomTest = async (level: string) => {
    // Використовуємо агрегацію MongoDB для отримання 1 випадкового документа
    const tests = await TestQuestion.aggregate([
        { $match: { level } },
        { $sample: { size: 1 } }
    ]);
    return tests[0] || null;
};