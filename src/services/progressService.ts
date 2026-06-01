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

// ─── Основна логіка нарахування прогресу (Атомарна) ─────────────────────────
export const updateUserProgress = async (
    telegramId: number, 
    activityType: 'word' | 'test' | 'text', 
    itemId?: string
) => {
    // 1. Отримуємо лише поточний стан дат для розрахунку лімітів (Read-only)
    const user = await User.findOne({ telegramId }).lean();
    if (!user) return { gainedXp: 0, totalXp: 0, streak: 0 };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
    let lastActivityDay = null;
    if (lastActivity) {
        lastActivityDay = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
    }

    let streakBonusXp = 0;
    let newStreak = user.streak || 0;
    let resetWordsLearnedToday = false;

    // 2. Логіка Вогників
    if (!lastActivityDay) {
        newStreak = 1;
        resetWordsLearnedToday = true;
        streakBonusXp = 10;
    } else {
        const diffTime = today.getTime() - lastActivityDay.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

        if (diffDays === 1) {
            newStreak += 1;
            resetWordsLearnedToday = true;
            streakBonusXp = 10 * newStreak;
        } else if (diffDays > 1) {
            newStreak = 1;
            resetWordsLearnedToday = true;
            streakBonusXp = 10;
        }
    }

    let gainedXp = 0;
    
    // 3. Підготовка атомарної операції
    const updateOps: any = {
        $set: { lastActivityDate: now, streak: newStreak },
        $inc: {}
    };

    if (resetWordsLearnedToday) {
        updateOps.$set.wordsLearnedToday = 0;
    }

    if (activityType === 'word' && itemId) {
        const alreadyLearned = user.learnedWordIds?.includes(itemId);
        if (!alreadyLearned) {
            gainedXp = 5;
            updateOps.$addToSet = { learnedWordIds: itemId };
            updateOps.$inc.wordsLearnedToday = 1;
            updateOps.$inc.wordsLearned = 1;
        }
    } 
    else if (activityType === 'test') {
        updateOps.$inc.testsPassed = 1;
        
        const lastTestDay = user.lastTestXpDate ? new Date(user.lastTestXpDate.getFullYear(), user.lastTestXpDate.getMonth(), user.lastTestXpDate.getDate()) : null;
        let currentTestXp = user.testXpEarnedToday || 0;

        if (!lastTestDay || lastTestDay.getTime() !== today.getTime()) {
            currentTestXp = 0;
            updateOps.$set.lastTestXpDate = now;
            updateOps.$set.testXpEarnedToday = 0; // Скидаємо ліміт у базі
        }

        if (currentTestXp + 10 <= 200) {
            gainedXp = 5; // Загалом даємо 5XP користувачу (як у твоєму старому коді)
            updateOps.$inc.testXpEarnedToday = 10; // Але ліміт рахуємо по 10
        } else {
            gainedXp = 0;
        }
    }
    else if (activityType === 'text') {
        gainedXp = 30;
    }

    const totalGainedThisTurn = gainedXp + streakBonusXp;

    if (totalGainedThisTurn > 0) {
        updateOps.$inc.xp = totalGainedThisTurn;
        updateOps.$inc.seasonXp = totalGainedThisTurn;
    }

    // Якщо немає інкрементів, видаляємо об'єкт $inc, щоб MongoDB не сварилася
    if (Object.keys(updateOps.$inc).length === 0) delete updateOps.$inc;

    // 4. ЄДИНИЙ запис у базу з атомарними модифікаторами
    const updatedUser = await User.findOneAndUpdate(
        { telegramId },
        updateOps,
        { new: true } // Повертає оновлений документ
    );
    
    return { 
        gainedXp: totalGainedThisTurn, 
        totalXp: updatedUser?.xp || 0, 
        streak: updatedUser?.streak || 0 
    };
};