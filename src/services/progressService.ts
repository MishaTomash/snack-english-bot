import { User } from '../models/User';

export const updateUserProgress = async (telegramId: number, activityType: 'word' | 'test', itemId?: string) => {
    const user = await User.findOne({ telegramId });
    if (!user) return { gainedXp: 0, streak: 0 };

    const now = new Date();
    // Вираховуємо початок сьогоднішнього дня (00:00:00)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
    let lastActivityDay = null;
    if (lastActivity) {
        lastActivityDay = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
    }

    // 1. ЛОГІКА ВОГНИКІВ (STREAK)
    if (!lastActivityDay) {
        user.streak = 1;
        user.wordsLearnedToday = 0;
    } else {
        const diffTime = today.getTime() - lastActivityDay.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

        if (diffDays === 1) {
            // Користувач зайшов на наступний день після попереднього — продовжуємо серію
            user.streak = (user.streak || 0) + 1;
            user.wordsLearnedToday = 0; 
        } else if (diffDays > 1) {
            // КОРИСТУВАЧ ПРОПУСТИВ БІЛЬШЕ 1 ДНЯ (ось тут ми обнуляємо вогники)
            user.streak = 1; 
            user.wordsLearnedToday = 0;
        }
    }

    user.lastActivityDate = now;

    let gainedXp = 0;

    // 2. НАРАХУВАННЯ СЛІВ, ТЕСТІВ ТА XP
    if (activityType === 'word' && itemId) {
        if (!user.learnedWordIds) user.learnedWordIds = [];
        if (!user.learnedWordIds.includes(itemId)) {
            user.learnedWordIds.push(itemId);
            user.wordsLearned = user.learnedWordIds.length;
            user.wordsLearnedToday = (user.wordsLearnedToday || 0) + 1;
            // ТУТ XP НЕ НАРАХОВУЄМО — захист від "читерства"
        }
    } else if (activityType === 'test') {
        user.testsPassed = (user.testsPassed || 0) + 1;
        
        // Даємо +5 XP ТІЛЬКИ за кожен правильний тест!
        gainedXp = 5;
        user.xp = (user.xp || 0) + gainedXp;
    }

    await user.save();
    
    // Повертаємо інформацію, щоб її можна було використати в повідомленнях
    return { gainedXp, totalXp: user.xp, streak: user.streak };
};