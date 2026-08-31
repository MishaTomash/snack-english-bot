import { Bot, InlineKeyboard } from "grammy";
import { TestQuestion } from "../../models/TestQuestion";
import { User } from "../../models/User"; // 👈 ДОДАНО ІМПОРТ
import { checkWordLimits } from "../middlewares/limits";

import { handleStart } from "../handlers/start";
import { handleWords } from "../handlers/words";
import { sendRandomTest } from "../handlers/tests";
import { showProfile } from "../handlers/profile";
import {
  handleAdminCommand,
  handleReferralBroadcastStart,
} from "../handlers/admin";
import { handleCoursesList } from "../handlers/courses";
import { createNewTopicCommand } from "../handlers/adminTopics";
import { handleTopMenu } from "../handlers/rating";
import { createLearningMenu } from "../keyboards/main";

export const registerCommands = (bot: Bot) => {
  bot.command("start", handleStart);
  bot.command("words", checkWordLimits, handleWords);
  bot.command("test", sendRandomTest);
  bot.command("profile", showProfile);
  bot.command("stats", showProfile);
  bot.command("admin", handleAdminCommand);
  bot.command("courses", handleCoursesList);
  bot.command("new_topic", createNewTopicCommand);
  bot.command("top", handleTopMenu);
  bot.command("broadcast_ref", handleReferralBroadcastStart);

  // 🆘 Команда HELP (Красиве форматування списку команд)
  bot.command("help", async (ctx) => {
    const helpText =
      `❓ <b>Довідковий центр SnackEnglish</b>\n\n` +
      `Ось список команд, які допоможуть тобі в навчанні:\n\n` +
      `🚀 <b>Основні:</b>\n` +
      `▫️ /start — 🏠 Головне меню та перезапуск\n` +
      `▫️ /learn — 📚 Відкрити меню навчання\n` +
      `▫️ /profile — 👤 Твій профіль та статистика\n` +
      `▫️ /top — 🏆 Рейтинг найактивніших учнів\n\n` +
      `⚡️ <b>Швидкий доступ:</b>\n` +
      `▫️ /words — 📖 Вчити нові слова\n` +
      `▫️ /test — 🎯 Пройти швидкий міні-тест\n` +
      `▫️ /courses — 🎓 Доступні курси\n\n` +
      `💬 <b>Залишилися питання або знайшов баг?</b>\n` +
      `Пиши розробнику → @misha_tom`;

    await ctx.reply(helpText, { parse_mode: "HTML" });
  });

  // 🎓 Команда LEARN (Виклик Inline-меню навчання)
  bot.command("learn", async (ctx) => {
    await ctx.reply(
      `🎓 <b>Розділ навчання</b>\n\n` +
        `Що будемо практикувати сьогодні? Обирай потрібний режим нижче: 👇`,
      {
        parse_mode: "HTML",
        reply_markup: createLearningMenu(),
      },
    );
  });

  bot.command("test_promo", async (ctx) => {
    const testUser = await User.findOne({ telegramId: ctx.from?.id });

    if (!testUser) {
      return ctx.reply("Ваш акаунт не знайдено в базі.");
    }

    testUser.isPremium = false;
    // testUser.premiumExpiresAt = null;
    await testUser.save();

    const keyboard = new InlineKeyboard().text(
      "⭐️ Продовжити преміум на місяць",
      "open_premium_menu", // ПЕРЕВІР, ЧИ ЦЕ ТВІЙ РЕАЛЬНИЙ CALLBACK
    );

    await ctx.reply(
      "Ваш безкоштовний преміум до Дня Незалежності закінчився! 😢\n\nЩоб надалі користуватися всіма можливостями, ви можете продовжити підписку:",
      { reply_markup: keyboard },
    );
  });

  bot.command("revoke_all_promo", async (ctx) => {
    const ADMIN_ID = 1734033519;
    if (ctx.from?.id !== ADMIN_ID) return;

    const now = new Date();

    const usersToExpire = await User.find({
      isPremium: true,
      premiumExpiresAt: { $lte: now }, // ПЕРЕВІР, ЧИ ПОЛЕ НАЗИВАЄТЬСЯ САМЕ ТАК
    });

    await ctx.reply(
      `Знайдено користувачів для зняття преміуму: ${usersToExpire.length}. Починаю розсилку...`,
    );

    let successCount = 0;
    const keyboard = new InlineKeyboard().text(
      "⭐️ Продовжити преміум на місяць",
      "open_premium_menu", // ПЕРЕВІР CALLBACK
    );

    for (const user of usersToExpire) {
      user.isPremium = false;
      await user.save();

      try {
        await ctx.api.sendMessage(
          user.telegramId,
          "Ваш безкоштовний преміум до Дня Незалежності закінчився! 😢\n\nЩоб надалі користуватися всіма можливостями, ви можете продовжити підписку:",
          { reply_markup: keyboard },
        );
        successCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.log(
          `Не вдалося надіслати повідомлення юзеру ${user.telegramId}`,
        );
      }
    }

    await ctx.reply(
      `✅ Готово! Преміум знято, повідомлення доставлено ${successCount} користувачам.`,
    );
  });

  // 🧹 Команда CLEARGENERAL
  bot.command("cleargeneral", async (ctx) => {
    try {
      const result = await TestQuestion.deleteMany({ wordId: null });
      await ctx.reply(
        `✅ <b>Очищення бази успішне!</b>\n\n` +
          `🗑 Видалено некоректних тестів: <b>${result.deletedCount}</b> шт.`,
        { parse_mode: "HTML" },
      );
    } catch (error) {
      console.error("Помилка при очищенні бази:", error);
      await ctx.reply(
        `❌ <b>Помилка!</b>\nНе вдалося виконати очищення бази даних. Перевір логи сервера.`,
        { parse_mode: "HTML" },
      );
    }
  });
};
