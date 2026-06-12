import { Bot } from 'grammy';

export const setupBotCommands = async (bot: Bot) => {
    await bot.api.setMyCommands([
        { command: 'start',   description: '🏠 Головне меню / перезапуск' },
        { command: 'profile', description: '👤 Мій профіль' },
        { command: 'top',     description: '🏆 Рейтинг тижня' },
        { command: 'help',    description: '❓ Допомога та контакти' },
    ]);

    console.log('✅ Меню команд встановлено');
};