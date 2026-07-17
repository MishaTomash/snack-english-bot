import { BotSettings, getSettings, PaymentMode } from '../models/BotSettings';

export const getPaymentMode = async (): Promise<PaymentMode> => {
  const settings = await getSettings();
  return settings.paymentMode || 'card';
};

export const setPaymentMode = async (mode: PaymentMode): Promise<void> => {
  await BotSettings.findOneAndUpdate({}, { paymentMode: mode }, { upsert: true });
};