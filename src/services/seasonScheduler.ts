import cron from 'node-cron';
import { Bot } from 'grammy';
import { TopCycle } from '../models/TopCycle';
import { endSeason, ensureActiveCycle } from './seasonService';

export const setupSeasonScheduler = async (bot: Bot) => {
    await ensureActiveCycle();

    // Щодня о 12:00 перевіряємо, чи не настав час завершення сезону
    cron.schedule('0 12 * * *', async () => {
        const activeCycle = await TopCycle.findOne({ isActive: true });
        if (!activeCycle) return;

        if (new Date() >= activeCycle.endDate) {
            console.log('🏁 Автоматичне завершення сезону...');
            await endSeason(bot.api);
        }
    });
};