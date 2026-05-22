import { Bot } from 'grammy';
import { CourseProgress } from './models/CourseProgress';
import { Course } from './models/Course';
import { InlineKeyboard } from 'grammy';

/**
 * Перевіряє раз на годину чи є юзери яким треба нагадати повторити курс.
 * Запускається з app.ts через startCronJobs(bot).
 */
export const startCronJobs = (bot: Bot) => {
  // Перевірка кожні 60 хвилин
  setInterval(async () => {
    try {
      const now = new Date();

      // Шукаємо всіх з reviewDate в минулому яким ще не надіслали нагадування
      const dueReminders = await CourseProgress.find({
        reviewDate: { $lte: now },
        completed: true,
      }).lean();

      for (const progress of dueReminders) {
        try {
          const course = await Course.findOne({ slug: progress.courseSlug }).lean();
          const courseTitle = course?.title ?? progress.courseSlug;

          await bot.api.sendMessage(
            progress.telegramId,
            `🔔 <b>НАГАДУВАННЯ</b>\n\nЧас повторити курс «<b>${courseTitle}</b>»!\n\nПовторення допомагає запам'ятати надовго. 💪`,
            {
              parse_mode: 'HTML',
              reply_markup: new InlineKeyboard().text(
                '📖 Розпочати повторення',
                `course_open_${progress.courseSlug}`,
              ),
            },
          );
        } catch (err: any) {
          // Юзер міг заблокувати бота (403) або видалити чат (400)
          if (err?.error_code !== 403 && err?.error_code !== 400) {
            console.error(`Помилка нагадування для ${progress.telegramId}:`, err.message);
          }
        } finally {
          // Цей блок виконається ЗАВЖДИ: і при успіху, і при помилці.
          // Очищуємо дату, щоб бот не намагався слати їм нагадування вічно.
          await CourseProgress.findByIdAndUpdate(progress._id, {
            $unset: { reviewDate: '' },
          });
        }
      }
    } catch (err) {
      console.error('Помилка cron job нагадувань:', err);
    }
  }, 60 * 60 * 1000); // кожну годину

  console.log('✅ Cron jobs запущено (нагадування про повторення курсів)');
};