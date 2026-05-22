import { Bot, InlineKeyboard } from 'grammy';
import { CourseProgress } from './models/CourseProgress';
import { Course } from './models/Course';
import { User } from './models/User';

// ─── Хелпер: поточний UTC "HH:MM" ────────────────────────────────────────────

const currentUTCTime = (): string => {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

// ─── Хелпер: чи сьогодні (UTC) дата? ─────────────────────────────────────────

const isToday = (date?: Date): boolean => {
  if (!date) return false;
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth()    === now.getUTCMonth()    &&
    date.getUTCDate()     === now.getUTCDate()
  );
};

// ─── Хелпер: скільки днів до дати ────────────────────────────────────────────

const daysUntil = (date: Date): number => {
  const now = Date.now();
  return Math.ceil((date.getTime() - now) / (1000 * 60 * 60 * 24));
};

// ─── Cron: нагадування про повторення курсу ───────────────────────────────────

const runCourseReminders = async (bot: Bot) => {
  try {
    const now = new Date();

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
        if (err?.error_code !== 403 && err?.error_code !== 400) {
          console.error(`Помилка нагадування курсу для ${progress.telegramId}:`, err.message);
        }
      } finally {
        await CourseProgress.findByIdAndUpdate(progress._id, {
          $unset: { reviewDate: '' },
        });
      }
    }
  } catch (err) {
    console.error('Помилка cron-job нагадувань курсів:', err);
  }
};

// ─── Cron: нагадування юзерам "нові слова доступні" ──────────────────────────
// Запускається щогодини, шукає юзерів у яких reminderTime збігається з поточною
// UTC-годиною і які не були активні сьогодні.

const runWordReminders = async (bot: Bot) => {
  try {
    const nowHHMM = currentUTCTime();
    // Беремо всіх у яких reminderTime починається на поточну годину (HH)
    const currentHour = nowHHMM.slice(0, 2);

    const usersToRemind = await User.find({
      reminderTime: { $regex: `^${currentHour}:` },
    }).lean();

    for (const user of usersToRemind) {
      // Пропускаємо якщо вже були активні сьогодні
      if (isToday(user.lastActivityDate)) continue;

      try {
        await bot.api.sendMessage(
          user.telegramId,
          `🌅 <b>Час вчити слова!</b>\n\nСьогоднішня порція нових слів вже чекає на тебе. Вперед! 💪`,
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text('📚 Нові слова', 'next_word'),
          },
        );

        // Після відправки — очищаємо reminderTime (одноразове нагадування)
        await User.findByIdAndUpdate(user._id, { $unset: { reminderTime: '' } });
      } catch (err: any) {
        if (err?.error_code !== 403 && err?.error_code !== 400) {
          console.error(`Помилка нагадування слів для ${user.telegramId}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Помилка cron-job нагадувань слів:', err);
  }
};

// ─── Cron: нагадування про закінчення Premium ────────────────────────────────
// Запускається раз на добу (перевіряємо щогодини, але шлемо тільки раз).

const runPremiumExpiryWarnings = async (bot: Bot) => {
  try {
    const now = new Date();

    // Знаходимо Premium-юзерів у яких ≤3 дні до закінчення
    const warningThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringUsers = await User.find({
      isPremium: true,
      premiumExpiresAt: { $lte: warningThreshold, $gte: now },
    }).lean();

    for (const user of expiringUsers) {
      if (!user.premiumExpiresAt) continue;

      const days = daysUntil(user.premiumExpiresAt);
      if (days < 0) continue;

      const dayLabel = days === 0 ? 'сьогодні' : days === 1 ? 'завтра' : `через ${days} дні`;

      try {
        await bot.api.sendMessage(
          user.telegramId,
          `⚠️ <b>Premium закінчується ${dayLabel}!</b>\n\n` +
          `Не зупиняй навчання — продовж підписку та зберігай прогрес. 🚀`,
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text('💎 Продовжити Premium', 'get_premium'),
          },
        );
      } catch (err: any) {
        if (err?.error_code !== 403 && err?.error_code !== 400) {
          console.error(`Помилка нагадування Premium для ${user.telegramId}:`, err.message);
        }
      }
    }

    // Деактивуємо прострочений Premium
    await User.updateMany(
      { isPremium: true, premiumExpiresAt: { $lt: now } },
      { $set: { isPremium: false } },
    );
  } catch (err) {
    console.error('Помилка cron-job перевірки Premium:', err);
  }
};

// ─── Головна точка запуску ────────────────────────────────────────────────────

export const startCronJobs = (bot: Bot) => {
  setInterval(async () => {
    await runCourseReminders(bot);
    await runWordReminders(bot);
    await runPremiumExpiryWarnings(bot);
  }, 60 * 60 * 1000); // щогодини

  console.log('✅ Cron jobs запущено (курси, слова, Premium)');
};