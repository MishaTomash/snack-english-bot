import { Bot } from 'grammy';
import { config } from '../config';
import { handleStart } from './handlers/start';
import { handleLevelSelection } from './handlers/level';
import { handleWords } from './handlers/words';
import { sendRandomText, handleShowTranslation } from './handlers/texts';
import { sendRandomTest, handleTestAnswer } from './handlers/tests';
import { trackActivity } from './middlewares/activity';
import { showProfile } from './handlers/profile';
import { checkWordLimits } from './middlewares/limits';
import { sendPremiumOffer, handlePremiumPurchase } from './handlers/premium';

export const bot = new Bot(config.BOT_TOKEN);
bot.use(trackActivity);

// Реєструємо команди (прибрали дублікат words)
bot.command('start', handleStart);
bot.command('words', checkWordLimits, handleWords);
bot.command('text', sendRandomText);
bot.command('test', sendRandomTest);
bot.command('profile', showProfile);
bot.command('stats', showProfile);
bot.command('premium', sendPremiumOffer);

// Реєструємо обробник інлайн-кнопок
bot.callbackQuery(/^level_/, handleLevelSelection);
bot.callbackQuery(/^trans_/, handleShowTranslation);
bot.callbackQuery('next_text', sendRandomText);
bot.callbackQuery(/^test_/, handleTestAnswer);
bot.callbackQuery('next_test', sendRandomTest);
bot.callbackQuery('buy_premium', handlePremiumPurchase);

// Реєструємо обробник кнопок головного меню
// Обгортаємо функції та додаємо checkWordLimits для кнопки "Нові слова"
bot.hears('📚 Нові слова', checkWordLimits, (ctx) => handleWords(ctx));
bot.hears('📝 Тексти для перекладу', (ctx) => sendRandomText(ctx));
bot.hears('🎯 Міні-тести', (ctx) => sendRandomTest(ctx));
bot.hears('👤 Мій профіль', (ctx) => showProfile(ctx));
bot.hears('💎 Premium', (ctx) => sendPremiumOffer(ctx));