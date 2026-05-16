import { Context, NextFunction } from 'grammy';
import { User } from '../../models/User';

export const trackActivity = async (ctx: Context, next: NextFunction) => {
    const telegramId = ctx.from?.id;
    
    if (telegramId) {
        const user = await User.findOne({ telegramId });
        
        if (user) {
            const now = new Date();
            const lastActive = user.lastActive || new Date(0);

            // Скидаємо час до початку доби для точного порівняння днів
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

            const diffTime = Math.abs(today.getTime() - lastActiveDay.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Користувач зайшов на наступний день
                user.streakDays = (user.streakDays || 0) + 1; 
            } else if (diffDays > 1) {
                // Користувач пропустив день — стрік скидається
                user.streakDays = 1; 
            } else if (!user.streakDays) {
                // Перший запис активності
                user.streakDays = 1;
            }

            user.lastActive = now;
            await user.save();
        }
    }
    
    // Передаємо управління далі іншим обробникам
    await next();
};