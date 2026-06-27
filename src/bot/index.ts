import { Bot } from 'grammy';
import { config } from '../config';
import { trackActivity } from './middlewares/activity';

import { registerLoggers } from './routes/loggers';
import { registerCommands } from './routes/commands';
import { registerCallbacks } from './routes/callbacks';
import { registerTextHandlers } from './routes/textHandlers';
import { registerHears } from './routes/hears';
import { registerPayments } from './routes/payments';
import { registerErrorHandler } from './routes/errors';

import { setupSeasonScheduler } from '../services/seasonScheduler';
import { setupBotCommands } from './setup/commands'; // ← додай імпорт

export const bot = new Bot(config.BOT_TOKEN);

registerLoggers(bot);
bot.use(trackActivity);

registerCommands(bot);
registerCallbacks(bot);
registerTextHandlers(bot);
registerHears(bot);
registerPayments(bot);
registerErrorHandler(bot);

setupSeasonScheduler(bot).catch(console.error);
setupBotCommands(bot).catch(console.error); // 