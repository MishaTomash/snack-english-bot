import { Bot } from 'grammy';
import { config } from '../config';
import { handleStart } from './handlers/start';
import { handleLevelSelection } from './handlers/level';

export const bot = new Bot(config.BOT_TOKEN);

// Реєструємо команду /start
bot.command('start', handleStart);

// Реєструємо обробник кнопок рівня (спрацює на всі callback data, що починаються з "level_")
bot.callbackQuery(/^level_/, handleLevelSelection);