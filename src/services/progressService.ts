import { User } from '../models/User';

// ─── Хелпер для визначення Рангу ─────────────────────────────────────────────
export const getRankInfo = (xp: number) => {
    const ranks = [
        { level: 1, name: 'Новачок', min: 0, max: 200 },
        { level: 2, name: 'Учень', min: 200, max: 500 },
        { level: 3, name: 'Знавець', min: 500, max: 1000 },
        { level: 4, name: 'Майстер', min: 1000, max: 2000 },
        { level: 5, name: 'Експерт', min: 2000, max: 3500 },
        { level: 6, name: 'Професор', min: 3500, max: 5500 },
        { level: 7, name: 'Легенда', min: 5500, max: 9999999 },
    ];
    
    const current = ranks.find(r => xp >= r.min && xp < r.max) || ranks[ranks.length - 1];
    return current;
};

// ─── Основна логіка нарахування прогресу ─────────────────────────────────────
export const updateUserProgress = async (
    telegramId: number, 
    activityType: 'word' | 'test' | 'text', 
    itemId?: string
) => {
    const user = await User.findOne({ telegramId });
    if (!user) return { gainedXp: 0, totalXp: 0, streak: 0 };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
    let lastActivityDay = null;
    if (lastActivity) {
        lastActivityDay = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
    }

    let streakBonusXp = 0;

    // 1. ЛОГІКА ВОГНИКІВ (STREAK)
    if (!lastActivityDay) {
        user.streak = 1;
        user.wordsLearnedToday = 0;
        streakBonusXp = 10; // Бонус за перший день
    } else {
        const diffTime = today.getTime() - lastActivityDay.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

        if (diffDays === 1) {
            user.streak = (user.streak || 0) + 1;
            user.wordsLearnedToday = 0; 
            streakBonusXp = 10 * user.streak; // +10 XP * кількість днів!
        } else if (diffDays > 1) {
            user.streak = 1; 
            user.wordsLearnedToday = 0;
            streakBonusXp = 10; // Знову 1-й день
        }
    }

    user.lastActivityDate = now;

    let gainedXp = 0;

    // 2. НАРАХУВАННЯ СЛІВ ТА XP
    if (activityType === 'word' && itemId) {
        if (!user.learnedWordIds) user.learnedWordIds = [];
        if (!user.learnedWordIds.includes(itemId)) {
            user.learnedWordIds.push(itemId);
            user.wordsLearned = user.learnedWordIds.length;
            user.wordsLearnedToday = (user.wordsLearnedToday || 0) + 1;
            
            gainedXp = 5; // +5 XP за нове слово
        }
    } 
    // 3. АНТИ-НАКРУТКА ДЛЯ ТЕСТІВ (Макс 200 XP на день)
    else if (activityType === 'test') {
        user.testsPassed = (user.testsPassed || 0) + 1;
        
        const lastTestDay = user.lastTestXpDate ? new Date(user.lastTestXpDate.getFullYear(), user.lastTestXpDate.getMonth(), user.lastTestXpDate.getDate()) : null;
        if (!lastTestDay || lastTestDay.getTime() !== today.getTime()) {
            user.testXpEarnedToday = 0;
            user.lastTestXpDate = now;
        }

        if ((user.testXpEarnedToday || 0) + 10 <= 200) {
            gainedXp = 5; // +10 XP за тест
            user.testXpEarnedToday = (user.testXpEarnedToday || 0) + 10;
        } else {
            gainedXp = 0; // Ліміт досягнуто
        }
    }
    // 4. ТЕКСТИ
    else if (activityType === 'text') {
        gainedXp = 30; // +30 XP за текст
    }


    const totalGainedThisTurn = gainedXp + streakBonusXp;
    user.xp = (user.xp || 0) + totalGainedThisTurn;
    user.seasonXp = (user.seasonXp || 0) + totalGainedThisTurn; // <--- ДОДАТИ ЦЕЙ РЯДОК

    await user.save();
    
    return { gainedXp: totalGainedThisTurn, totalXp: user.xp, streak: user.streak };
};