// src/bot/handlers/promoIndependence.ts

import { Bot, InlineKeyboard } from "grammy";
import { User } from "../../models/User";

const CHANNEL_ID = "@snackEnglish_ua"; // Твій канал
const CHANNEL_URL = "https://t.me/snackEnglish_ua"; // Посилання

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const setupIndependencePromo = (bot: Bot): void => {
  // ==========================================
  // 1. КОМАНДА ДЛЯ ТЕСТУ (Відправляє тільки тобі)
  // ==========================================
  bot.command("test_promo", async (ctx) => {
    const text =
      `🇺🇦 <b>З Днем Незалежності України!</b> 💛💙\n\n` +
      `Сьогодні свято, тому я підготував для вас подарунок! 🎁\n\n` +
      `Усі, хто сьогодні підпишеться на мій Telegram-канал, автоматично та безкоштовно отримають <b>Premium-доступ на 1 тиждень</b> у цьому боті.\n\n` +
      `Не витрачайте час — пропозиція діє лише сьогодні. Тисніть кнопку нижче, підписуйтесь і забирайте свій подарунок! 👇`;

    const keyboard = new InlineKeyboard()
      .url("🇺🇦 Перейти в канал", CHANNEL_URL)
      .row()
      .text("🎁 Я підписався! Дати Premium", "check_indep_sub");

    await ctx.reply("🛠 <b>ТЕСТОВЕ ПОВІДОМЛЕННЯ:</b>", { parse_mode: "HTML" });
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  });

  // ==========================================
  // 2. КОМАНДА ДЛЯ РОЗСИЛКИ ВСІМ
  // ==========================================
  bot.command("send_promo_24", async (ctx) => {
    await ctx.reply(
      "⏳ <b>Розпочинаю розсилку...</b> Це може зайняти кілька хвилин.",
      { parse_mode: "HTML" },
    );

    const users = await User.find({ isBlocked: false }).select("telegramId");
    let successCount = 0;
    let blockCount = 0;

    const text =
      `🇺🇦 <b>З Днем Незалежності України!</b> 💛💙\n\n` +
      `Сьогодні свято, тому я підготував для вас подарунок! 🎁\n\n` +
      `Усі, хто сьогодні підпишеться на мій Telegram-канал, автоматично та безкоштовно отримають <b>Premium-доступ на 1 тиждень</b> у цьому боті.\n\n` +
      `Не витрачайте час — пропозиція діє лише сьогодні. Тисніть кнопку нижче, підписуйтесь і забирайте свій подарунок! 👇`;

    const keyboard = new InlineKeyboard()
      .url("🇺🇦 Перейти в канал", CHANNEL_URL)
      .row()
      .text("🎁 Я підписався! Дати Premium", "check_indep_sub");

    for (const user of users) {
      try {
        await bot.api.sendMessage(user.telegramId, text, {
          parse_mode: "HTML",
          reply_markup: keyboard,
        });
        successCount++;
      } catch (error: any) {
        if (error.description?.includes("bot was blocked by the user")) {
          await User.updateOne(
            { telegramId: user.telegramId },
            { $set: { isBlocked: true } },
          );
          blockCount++;
        }
      }
      await delay(50);
    }

    await ctx.reply(
      `✅ <b>Розсилка успішно завершена!</b>\n\n🚀 Відправлено: ${successCount}\n❌ Заблокували бота: ${blockCount}`,
      { parse_mode: "HTML" },
    );
  });

  // ==========================================
  // 3. ОБРОБНИК КНОПКИ "Я ПІДПИСАВСЯ"
  // ==========================================
  bot.callbackQuery("check_indep_sub", async (ctx) => {
    const userId = ctx.from.id;

    try {
      const chatMember = await ctx.api.getChatMember(CHANNEL_ID, userId);
      const isSubscribed = ["member", "administrator", "creator"].includes(
        chatMember.status,
      );

      if (isSubscribed) {
        // 👇 ДОДАЄМО 7 ДНІВ ВІД ПОТОЧНОЇ ДАТИ
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 7);

        await User.updateOne(
          { telegramId: userId },
          {
            $set: {
              isPremium: true,
              premiumExpiresAt: expireDate, // Записуємо дату на тиждень вперед
            },
          },
        );

        await ctx.answerCallbackQuery({
          text: "✅ Дякую за підписку! Premium на 1 тиждень успішно активовано!",
          show_alert: true,
        });

        await ctx.editMessageText(
          "🇺🇦 <b>З Днем Незалежності!</b> 💛💙\n\n✅ Ви успішно підписалися на канал і отримали свій Premium на 1 тиждень. Насолоджуйтесь навчанням!",
          { parse_mode: "HTML" },
        );
      } else {
        await ctx.answerCallbackQuery({
          text: "❌ Ви ще не підписалися на канал! Перейдіть за посиланням, підпишіться і натисніть кнопку знову.",
          show_alert: true,
        });
      }
    } catch (error) {
      console.error("Помилка промо-підписки:", error);
      await ctx.answerCallbackQuery({
        text: "⚠️ Сталася помилка. Переконайтеся, що бот є адміністратором каналу.",
        show_alert: true,
      });
    }
  });
};
