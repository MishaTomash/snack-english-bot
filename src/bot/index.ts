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
// Імпортуємо нові обробники для Зірок
import { sendPremiumOffer, handlePreCheckoutQuery, handleSuccessfulPayment } from './handlers/premium';
import { showSettings, handleChangeLevelClick } from './handlers/settings';
import { handleAdminCommand, handleExitAdmin, handleAddWordPrompt, handleAddTestPrompt, handleAddTextPrompt, handleAdminTextInbound, handleAdminUsers } from './handlers/admin';
import { handleAdminStats } from './handlers/admin';
import { handleSavedWords, handleNextSavedWord, handleDeleteSavedWord, handleSaveWord } from './handlers/saved';


export const bot = new Bot(config.BOT_TOKEN);
bot.use(trackActivity);

// Реєструємо команди
bot.command('start', handleStart);
bot.command('words', checkWordLimits, handleWords);
bot.command('text', sendRandomText);
bot.command('test', sendRandomTest);
bot.command('profile', showProfile);
bot.command('stats', showProfile);
bot.command('premium', sendPremiumOffer);
bot.command('admin', handleAdminCommand);

// Реєструємо обробник інлайн-кнопок
bot.callbackQuery(/^level_/, handleLevelSelection);
bot.callbackQuery(/^trans_/, handleShowTranslation);
bot.callbackQuery('next_text', sendRandomText);
bot.callbackQuery(/^test_/, handleTestAnswer);
bot.callbackQuery('next_test', sendRandomTest);
bot.callbackQuery('next_word', checkWordLimits, (ctx: any) => handleWords(ctx));
bot.callbackQuery(/^audio_/, (ctx: any) => handleWordAudio(ctx));
bot.callbackQuery('buy_premium', (ctx: any) => sendPremiumOffer(ctx));
bot.callbackQuery('change_level', handleChangeLevelClick);
bot.callbackQuery(/^next_saved_/, handleNextSavedWord);
bot.callbackQuery(/^del_saved_/, handleDeleteSavedWord);
bot.callbackQuery(/^save_word_/, handleSaveWord);

// ⭐️ Обробка етапів оплати Зірками
bot.on('pre_checkout_query', handlePreCheckoutQuery);
bot.on('message:successful_payment', handleSuccessfulPayment);
bot.on('message:text', (ctx, next) => handleAdminTextInbound(ctx, next));

// Реєструємо обробник кнопок головного меню
bot.hears('📚 Нові слова', checkWordLimits, (ctx) => handleWords(ctx));
bot.hears('📝 Тексти для перекладу', (ctx) => sendRandomText(ctx));
bot.hears('🎯 Міні-тести', (ctx) => sendRandomTest(ctx));
bot.hears('👤 Мій профіль', (ctx) => showProfile(ctx));
bot.hears('💎 Premium', (ctx) => sendPremiumOffer(ctx));
bot.hears('⚙️ Налаштування', (ctx) => showSettings(ctx));
bot.hears('🚪 Вийти з адмінки', handleExitAdmin);
bot.hears('➕ Додати слово', (ctx) => handleAddWordPrompt(ctx));
bot.hears('➕ Додати тест', (ctx) => handleAddTestPrompt(ctx));
bot.hears('➕ Додати текст', (ctx) => handleAddTextPrompt(ctx));
bot.hears('📊 Статистика бази', (ctx) => handleAdminStats(ctx));
bot.hears('📚 Словничок', (ctx) => handleSavedWords(ctx));
bot.hears('👥 Користувачі', handleAdminUsers);