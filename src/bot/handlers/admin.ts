import { Context } from 'grammy';
import { config } from '../../config';
import { createAdminMenu } from '../keyboards/admin';
import { createMainMenu } from '../keyboards/main';

export const handleAdminCommand = async (ctx: Context) => {
    const userId = ctx.from?.id;

    // Перевірка на права адміністратора
    if (userId !== config.ADMIN_ID) {
        return; // Звичайні користувачі навіть не дізнаються, що така команда існує
    }

    await ctx.reply('👨‍💻 *Ласкаво просимо до Адмін-панелі!*\n\nОберіть дію на клавіатурі знизу.', {
        parse_mode: 'Markdown',
        reply_markup: createAdminMenu()
    });
};

export const handleExitAdmin = async (ctx: Context) => {
    await ctx.reply('🚪 Ви вийшли з режиму адміністратора.', {
        reply_markup: createMainMenu()
    });
};