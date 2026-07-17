import { Bot } from 'grammy';
import { handleJarScreenshot } from '../handlers/jarPayment';

export const registerPaymentPhotos = (bot: Bot) => {
  bot.on('message:photo', handleJarScreenshot);
};