import { Bot } from 'grammy';
import { checkWordLimits } from '../middlewares/limits';

import {
  handleExitAdmin, handleAddWordPrompt, handleAddTestPrompt,
  handleAdminStats, handleAdminUsers, handleBroadcastStart, handleReferralBroadcastStart
} from '../handlers/admin';
import { handleAdminTopicsMenu } from '../handlers/adminTopics';
import { handleAdminCoursesMenu, handleForceMenuUpdate } from '../handlers/adminCourses';
import { handleSeasonAdminMenu } from '../handlers/seasonAdmin';

import { handleWords } from '../handlers/words';
import { sendLearnedWordsTest, sendRandomTest, checkTestLimits } from '../handlers/tests';
import { handleSavedWords } from '../handlers/saved';
import { showProfile } from '../handlers/profile';
import { showSettings } from '../handlers/settings';
import { handleCoursesList } from '../handlers/courses';
import { handleTopMenu } from '../handlers/rating';
import { handleTopicsMenu } from '../handlers/topics';
import { sendPremiumMenu } from '../handlers/premium';
import { handleClearBlockedUsers } from '../handlers/adminCleanUser';
import { createLearningMenu } from '../keyboards/main';
import { handleAddSentencePrompt, handleAdminPremiumUsers } from '../handlers/admin';
import {
  handleStartChat, handleExitChat,
  handleChatHint, handleChatTranslate,
} from '../handlers/chat';
import { handleAdminPaymentModeMenu } from '../handlers/paymentAdmin';


export const registerHears = (bot: Bot) => {
  // Адмін
  bot.hears('🚪 Вийти з адмінки', handleExitAdmin);
  bot.hears('➕ Додати слово', handleAddWordPrompt);
  bot.hears('➕ Додати тест', handleAddTestPrompt);
  // bot.hears('➕ Додати текст', handleAddTextPrompt);
  bot.hears('📊 Статистика бази', handleAdminStats);
  bot.hears('👥 Користувачі', handleAdminUsers);
  bot.hears('📢 Розсилка', handleBroadcastStart);
  bot.hears('📚 Теми (Адмін)', handleAdminTopicsMenu);
  bot.hears('🎓 Керування курсами', handleAdminCoursesMenu);
  bot.hears('🔄 Оновити меню', handleForceMenuUpdate);
  bot.hears('🏆 Сезон рейтингу', handleSeasonAdminMenu);
  bot.hears('🧹заблокованих', handleClearBlockedUsers);
  bot.hears('✍️ Додати речення', handleAddSentencePrompt);
  bot.hears('💎 Premium юзери', handleAdminPremiumUsers);
  bot.hears('🔗 Реф. розсилка', handleReferralBroadcastStart);
  bot.hears('💳 Спосіб оплати', handleAdminPaymentModeMenu);



  // === НОВЕ ГОЛОВНЕ МЕНЮ ===
  bot.hears('📚 Навчання', async (ctx) => {
    await ctx.reply('🎓 <b>Розділ навчання</b>\n\nЩо будемо практикувати сьогодні? Обирай потрібний режим нижче: 👇', {
      parse_mode: 'HTML',
      reply_markup: createLearningMenu(), // Викликаємо Inline-кнопки
    });
  });

  bot.hears('👤 Профіль', showProfile);
  bot.hears('⚙️ Налаштування', showSettings);
  bot.hears('🏆 Топчик', handleTopMenu);
  bot.hears('💎 Premium', sendPremiumMenu);

  bot.hears('📚 Вчити слова', checkWordLimits, handleWords);
  bot.hears('📝 Перевірка слів', sendLearnedWordsTest);
  bot.hears('🎯 Міні-тести', checkTestLimits, sendRandomTest);
  bot.hears('💾 Словничок', handleSavedWords);
  bot.hears('🎓 Курси', handleCoursesList);
  bot.hears('📚 Слова по темах', handleTopicsMenu);
  bot.hears('💬 Чатік (NEW 🔥)', handleStartChat);
  bot.hears('❌ Завершити чат', handleExitChat);
  bot.hears('💡 Підказка', handleChatHint);
  bot.hears('📝 Перекласти', handleChatTranslate);
};