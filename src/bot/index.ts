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

// Реєструємо команду /start
bot.command('start', handleStart);
bot.command('words', handleWords);
bot.command('text', sendRandomText);
bot.command('test', sendRandomTest);
bot.command('profile', showProfile);
bot.command('stats', showProfile);
bot.command('words', checkWordLimits, handleWords);
bot.command('premium', sendPremiumOffer);

// Реєструємо обробник кнопок рівня (спрацює на всі callback data, що починаються з "level_")
bot.callbackQuery(/^level_/, handleLevelSelection);
bot.callbackQuery(/^trans_/, handleShowTranslation);
bot.callbackQuery('next_text', sendRandomText);
bot.callbackQuery(/^test_/, handleTestAnswer);
bot.callbackQuery('next_test', sendRandomTest);
bot.callbackQuery('buy_premium', handlePremiumPurchase);
