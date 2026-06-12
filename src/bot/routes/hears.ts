import { Bot } from 'grammy';
import { checkWordLimits } from '../middlewares/limits';

import {
  handleExitAdmin, handleAddWordPrompt, handleAddTestPrompt, handleAddTextPrompt,
  handleAdminStats, handleAdminUsers, handleBroadcastStart
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

export const registerHears = (bot: Bot) => {
  // Адмін
  bot.hears('🚪 Вийти з адмінки', handleExitAdmin);
  bot.hears('➕ Додати слово', handleAddWordPrompt);
  bot.hears('➕ Додати тест', handleAddTestPrompt);
  bot.hears('➕ Додати текст', handleAddTextPrompt);
  bot.hears('📊 Статистика бази', handleAdminStats);
  bot.hears('👥 Користувачі', handleAdminUsers);
  bot.hears('📢 Розсилка', handleBroadcastStart);
  bot.hears('📚 Теми (Адмін)', handleAdminTopicsMenu);
  bot.hears('🎓 Керування курсами', handleAdminCoursesMenu);
  bot.hears('🔄 Оновити меню', handleForceMenuUpdate);
  bot.hears('🏆 Сезон рейтингу', handleSeasonAdminMenu);
  bot.hears('🧹 Очистити заблокованих', handleClearBlockedUsers)

  // Користувач
  bot.hears('📚 Вчити слова', checkWordLimits, handleWords);
  bot.hears('📝 Перевірка слів', sendLearnedWordsTest);
  bot.hears('🎯 Міні-тести', checkTestLimits, sendRandomTest);
  bot.hears('💾 Словничок', handleSavedWords);
  bot.hears('👤 Профіль', showProfile);
  bot.hears('⚙️ Налаштування', showSettings);
  bot.hears('🎓 Курси', handleCoursesList);
  bot.hears('🏆 Топчик', handleTopMenu);
  bot.hears('📚 Слова по темах', handleTopicsMenu);
  bot.hears('💎 Premium', sendPremiumMenu);
};