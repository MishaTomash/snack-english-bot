import mongoose from 'mongoose';
import { bot } from './bot';
import { config } from './config';
import { startCronJobs } from './bot/cron';
import { GrammyError, HttpError } from 'grammy'; // 👈 ДОДАНО ІМПОРТ 

// 👇 ДОДАНО ОБРОБНИК ПОМИЛОК
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`❌ Помилка під час обробки апдейту ${ctx.update.update_id}:`);
  const e = err.error;

  if (e instanceof GrammyError) {
    if (e.error_code === 403) {
      console.warn(`⚠️ Бот не зміг надіслати повідомлення, бо користувач (ID: ${ctx.from?.id}) заблокував його.`);
      return; // Просто ігноруємо і не "вбиваємо" бота
    }
    console.error("Помилка в запиті до Telegram API:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Не вдалося зв'язатися з Telegram (помилка мережі):", e);
  } else {
    console.error("Внутрішня помилка додатку:", e);
  }
});

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