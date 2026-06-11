import dotenv from 'dotenv';

dotenv.config();

export const config = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  MONGO_URI: process.env.MONGO_URI || '',
  ADMIN_ID: Number(process.env.ADMIN_ID) || 0, 
};

if (!config.BOT_TOKEN) {
  throw new Error('❌ BOT_TOKEN не знайдено у файлі .env!');
}

if (!config.MONGO_URI) {
  throw new Error('❌ MONGO_URI не знайдено у файлі .env!');
}

if (!config.ADMIN_ID) {
  console.warn('⚠️ Попередження: ADMIN_ID не налаштовано в .env. Адмін-панель буде недоступна.');
}