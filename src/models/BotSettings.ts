import mongoose, { Schema, Document } from 'mongoose';

export interface IBotSettings extends Document {
  trophyStickerId: string | null;
}

const BotSettingsSchema = new Schema({
  trophyStickerId: { type: String, default: null },
});

export const BotSettings = mongoose.model<IBotSettings>('BotSettings', BotSettingsSchema);

// Завжди гарантує наявність одного документа налаштувань
export const getSettings = async () => {
  let settings = await BotSettings.findOne();
  if (!settings) settings = await BotSettings.create({});
  return settings;
};