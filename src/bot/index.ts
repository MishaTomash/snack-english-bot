import { Bot } from 'grammy';
import { config } from '../config';
import { handleStart } from './handlers/start';
import { handleLevelSelection } from './handlers/level';
import { handleWords } from './handlers/words';
import { sendRandomText, handleShowTranslation } from './handlers/texts';

export const bot = new Bot(config.BOT_TOKEN);

// Реєструємо команду /start
bot.command('start', handleStart);
bot.command('words', handleWords);
bot.command('text', sendRandomText);

// Реєструємо обробник кнопок рівня (спрацює на всі callback data, що починаються з "level_")
bot.callbackQuery(/^level_/, handleLevelSelection);
bot.callbackQuery(/^trans_/, handleShowTranslation);
bot.callbackQuery('next_text', sendRandomText);