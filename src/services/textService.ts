import { Text, IText } from '../models/Text';

export const getRandomText = async (level: string): Promise<IText | null> => {
  const texts = await Text.aggregate([
    { $match: { level } },
    { $sample: { size: 1 } }
  ]);
  return texts.length > 0 ? texts[0] : null;
};

export const getTextById = async (id: string): Promise<IText | null> => {
  return await Text.findById(id);
};