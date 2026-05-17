import { Context } from 'grammy';
import { User } from '../../models/User';
import { mainMenuKeyboard } from '../keyboards/main';

export const handleLevelSelection = async (ctx: Context) => {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;
    
    const telegramId = ctx.from?.id;

    if (!telegramId) return;

    const level = callbackData.split('_')[1];


    await User.findOneAndUpdate(
        { telegramId },
        { level },
        { new: true }
    );

    // Прибираємо інлайн-кнопки з попереднього повідомлення
    await ctx.editMessageText(`✅ Супер! Твій рівень встановлено: **${level}**.\n\nТепер я буду підбирати матеріали спеціально для тебе!`, {
        parse_mode: 'Markdown'
    });
    
    // Надсилаємо нове повідомлення з головним меню
    await ctx.reply('Обери, з чого почнемо сьогодні? 👇', {
        reply_markup: mainMenuKeyboard
    });

    await ctx.answerCallbackQuery();
};