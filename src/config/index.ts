import dotenv from 'dotenv';

dotenv.config();

export const config = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  MONGO_URI: process.env.MONGO_URI || '',
};

if (!config.BOT_TOKEN) {
  throw new Error('❌ BOT_TOKEN не знайдено у файлі .env!');
}

if (!config.MONGO_URI) {
  throw new Error('❌ MONGO_URI не знайдено у файлі .env!');
}