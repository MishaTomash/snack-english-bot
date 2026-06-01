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
    // 1. Отримуємо поточний стан (Read-only)
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
    let isNewDayForActivity = false;

    // 2. Логіка Вогників
    if (!lastActivityDay) {
        newStreak = 1;
        isNewDayForActivity = true;
        streakBonusXp = 10;
    } else {
        const diffTime = today.getTime() - lastActivityDay.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

        if (diffDays === 1) {
            newStreak += 1;
            isNewDayForActivity = true;
            streakBonusXp = 10 * newStreak;
        } else if (diffDays > 1) {
            newStreak = 1;
            isNewDayForActivity = true;
            streakBonusXp = 10;
        }
    }

    let gainedXp = 0;
    
    // 3. Підготовка атомарної операції
    const updateOps: any = {
        $set: { lastActivityDate: now, streak: newStreak },
        $inc: {}
    };

    if (isNewDayForActivity) {
        // За замовчуванням скидаємо слова
        updateOps.$set.wordsLearnedToday = 0;
    }

    // 4. Логіка нарахування по типах активності
    if (activityType === 'word' && itemId) {
        const alreadyLearned = user.learnedWordIds?.includes(itemId);
        if (!alreadyLearned) {
            gainedXp = 5;
            updateOps.$addToSet = { learnedWordIds: itemId };
            updateOps.$inc.wordsLearned = 1;

            // ✅ ВИПРАВЛЕННЯ: Щоб уникнути конфлікту $set та $inc для одного поля
            if (isNewDayForActivity) {
                updateOps.$set.wordsLearnedToday = 1; // Встановлюємо жорстко, якщо це перше слово за день
            } else {
                updateOps.$inc.wordsLearnedToday = 1; // Інкремент, якщо день той самий
            }
        }
    } 
    else if (activityType === 'test') {
        updateOps.$inc.testsPassed = 1;
        
        const lastTestDay = user.lastTestXpDate ? new Date(user.lastTestXpDate.getFullYear(), user.lastTestXpDate.getMonth(), user.lastTestXpDate.getDate()) : null;
        const isNewTestDay = !lastTestDay || lastTestDay.getTime() !== today.getTime();

        if (isNewTestDay) {
            updateOps.$set.lastTestXpDate = now;
        }

        let currentTestXp = isNewTestDay ? 0 : (user.testXpEarnedToday || 0);

        if (currentTestXp + 10 <= 200) {
            gainedXp = 5; 
            
            // ✅ ВИПРАВЛЕННЯ: Уникаємо конфлікту
            if (isNewTestDay) {
                updateOps.$set.testXpEarnedToday = 10; // Це перший тест за день
            } else {
                updateOps.$inc.testXpEarnedToday = 10; // Додаємо до існуючого прогресу
            }
        } else if (isNewTestDay) {
            updateOps.$set.testXpEarnedToday = 0;
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

    // Підчищаємо пусті об'єкти, щоб MongoDB не сварилася
    if (Object.keys(updateOps.$inc).length === 0) delete updateOps.$inc;

    // 5. Запис у базу
    const updatedUser = await User.findOneAndUpdate(
        { telegramId },
        updateOps,
        { returnDocument: 'after' } // ✅ ВИПРАВЛЕННЯ: Замінив { new: true } згідно з новими вимогами Mongoose
    );
    
    return { 
        gainedXp: totalGainedThisTurn, 
        totalXp: updatedUser?.xp || 0, 
        streak: updatedUser?.streak || 0 
    };
};