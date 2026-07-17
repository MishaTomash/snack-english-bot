import mongoose, { Schema, Document } from 'mongoose';

export type PaymentMode = 'card' | 'jar';

export interface IBotSettings extends Document {
  paymentMode: PaymentMode;
}

const BotSettingsSchema = new Schema({
  paymentMode: { type: String, enum: ['card', 'jar'], default: 'card' },
});

export const BotSettings = mongoose.model<IBotSettings>('BotSettings', BotSettingsSchema);

export const getSettings = async () => {
  let settings = await BotSettings.findOne();
  if (!settings) settings = await BotSettings.create({});
  return settings;
};