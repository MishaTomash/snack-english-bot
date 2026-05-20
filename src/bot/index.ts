import { Bot } from 'grammy';
import { config } from '../config';
import { handleStart } from './handlers/start';
import { handleLevelSelection } from './handlers/level';
import { handleWords, handleWordAudio } from './handlers/words';
import { sendRandomText, handleShowTranslation } from './handlers/texts';
import { sendRandomTest, handleTestAnswer } from './handlers/tests';
import { trackActivity } from './middlewares/activity';
import { showProfile } from './handlers/profile';
import { checkWordLimits } from './middlewares/limits';
import { sendPremiumOffer, handlePreCheckoutQuery } from './handlers/premium';
import { showSettings, handleChangeLevelClick } from './handlers/settings';
import {
  handleAdminCommand,
  handleExitAdmin,
  handleAddWordPrompt,
  handleAddTestPrompt,
  handleAddTextPrompt,
  handleAdminTextInbound,
  handleAdminUsers,
  handleAdminUsersPagination, // ✅ Новий імпорт для пагінації
  handleAdminMessages,
  handleAdminStats,
  handleBroadcastStart,
} from './handlers/admin';
import { handleSavedWords, handleNextSavedWord, handleDeleteSavedWord, handleSaveWord } from './handlers/saved';
import {
  handleSupportMenu,
  handleStarsInvoice,
  handlePreCheckout,
  handleSuccessfulPayment,
} from './handlers/support';

export const bot = new Bot(config.BOT_TOKEN);

bot.use(trackActivity);

// ─── Команди ──────────────────────────────────────────────────────────────────

bot.command('start', handleStart);
bot.command('words', checkWordLimits, handleWords);
bot.command('text', sendRandomText);
bot.command('test', sendRandomTest);
bot.command('profile', showProfile);
bot.command('stats', showProfile);
bot.command('premium', sendPremiumOffer);
bot.command('admin', handleAdminCommand);

// ─── Інлайн-кнопки ───────────────────────────────────────────────────────────

bot.callbackQuery(/^stars_/, handleStarsInvoice);
bot.callbackQuery(/^level_/, handleLevelSelection);
bot.callbackQuery(/^trans_/, handleShowTranslation);
bot.callbackQuery(/^test_/, handleTestAnswer);
bot.callbackQuery(/^audio_/, handleWordAudio);
bot.callbackQuery(/^next_saved_/, handleNextSavedWord);
bot.callbackQuery(/^del_saved_/, handleDeleteSavedWord);
bot.callbackQuery(/^save_word_/, handleSaveWord);
bot.callbackQuery(/^admin_users_\d+$/, handleAdminUsersPagination); // ✅ Пагінація юзерів

bot.callbackQuery('next_text', sendRandomText);
bot.callbackQuery('next_test', sendRandomTest);
bot.callbackQuery('next_word', checkWordLimits, handleWords);
bot.callbackQuery('buy_premium', sendPremiumOffer);
bot.callbackQuery('change_level', handleChangeLevelClick);

// ─── Платежі ─────────────────────────────────────────────────────────────────

// ✅ pre_checkout_query реєструється ОДИН раз — два обробники на одну подію не працюють
bot.on('pre_checkout_query', handlePreCheckout);
bot.on('message:successful_payment', handleSuccessfulPayment);

// ─── Текстові повідомлення ────────────────────────────────────────────────────

// ✅ Порядок важливий: спочатку адмін-текст (middleware), потім розсилка
bot.on('message:text', handleAdminTextInbound);
bot.on('message', handleAdminMessages);

// ─── Кнопки головного меню ───────────────────────────────────────────────────

bot.hears('📚 Нові слова', checkWordLimits, handleWords);
bot.hears('📝 Тексти для перекладу', sendRandomText);
bot.hears('🎯 Міні-тести', sendRandomTest);
bot.hears('👤 Мій профіль', showProfile);
bot.hears('💎 Premium', sendPremiumOffer);
bot.hears('⚙️ Налаштування', showSettings);
bot.hears('🚪 Вийти з адмінки', handleExitAdmin);
bot.hears('➕ Додати слово', handleAddWordPrompt);
bot.hears('➕ Додати тест', handleAddTestPrompt);
bot.hears('➕ Додати текст', handleAddTextPrompt);
bot.hears('📊 Статистика бази', handleAdminStats);
bot.hears('📚 Словничок', handleSavedWords);
bot.hears('👥 Користувачі', handleAdminUsers);
bot.hears('📢 Розсилка', handleBroadcastStart);
bot.hears('💖 Підтримати', handleSupportMenu);