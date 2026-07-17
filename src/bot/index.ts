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
import { setupBotCommands } from './setup/commands'; 
import { chatModeMiddleware } from './middlewares/chatMode';
import { handleStatusChatCommand, handleStatusChatPageCallback, handleStatusChatUserCallback } from './handlers/adminChat';
import { registerPaymentPhotos } from './routes/paymentPhotos';




export const bot = new Bot(config.BOT_TOKEN);

registerLoggers(bot);
bot.use(trackActivity);
bot.use(chatModeMiddleware);

registerCommands(bot);
registerCallbacks(bot);
registerTextHandlers(bot);
registerHears(bot);
registerPaymentPhotos(bot);
registerPayments(bot);
registerErrorHandler(bot);

setupSeasonScheduler(bot).catch(console.error);
setupBotCommands(bot).catch(console.error); 

bot.command('statuschat', handleStatusChatCommand);
bot.callbackQuery(/^statuschat_page_\d+$/, handleStatusChatPageCallback);
bot.callbackQuery(/^statuschat_user_\d+_\d+$/, handleStatusChatUserCallback);