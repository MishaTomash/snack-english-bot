import mongoose from 'mongoose';
import { bot } from './bot';
import { config } from './config';
import { startCronJobs } from './bot/cron';

const startApp = async () => {
  try {

    console.log('⏳ Підключення до MongoDB...');
    await mongoose.connect(config.MONGO_URI);
    console.log('✅ Успішно підключено до MongoDB!');

    startCronJobs(bot);

    console.log('⏳ Запуск бота...');
    await bot.start();

  } catch (error) {
    console.error('❌ Помилка під час запуску додатку:', error);
    process.exit(1);
  }
};

startApp();