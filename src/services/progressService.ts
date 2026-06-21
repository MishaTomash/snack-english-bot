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

    return ranks.find(r => xp >= r.min && xp < r.max) || ranks[ranks.length - 1];
};

// ─── Основна логіка нарахування прогресу (БЕЗ ЛІМІТІВ) ───────────────────────
export const updateUserProgress = async (
    telegramId: number,
    activityType: 'word' | 'test' | 'text'
) => {
    const user = await User.findOne({ telegramId });
    if (!user) return { gainedXp: 0, streakBonusXp: 0, totalGained: 0, limitReached: false };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let gainedXp = 0;
    let streakBonusXp = 0;

    const updateOps: any = {
        $set: { lastActive: now, lastActivityDate: now },
        $inc: {}
    };

    // 1️⃣ Обробка Серії Днів (Streak) + Бонус за активність
    const lastActiveDate = user.lastActive ? new Date(user.lastActive.getFullYear(), user.lastActive.getMonth(), user.lastActive.getDate()) : null;

    if (!lastActiveDate) {
        updateOps.$set.streak = 1;
    } else {
        const diffTime = today.getTime() - lastActiveDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            updateOps.$inc.streak = 1;
            const currentStreak = (user.streak || 0) + 1;
            if (currentStreak % 5 === 0) {
                streakBonusXp = 15; // Бонусні XP кожні 5 днів серії
            }
        } else if (diffDays > 1) {
            updateOps.$set.streak = 1;
        }
    }

    // 2️⃣ Безкінечне нарахування балів без лімітів
    if (activityType === 'word') {
        gainedXp = 10;
        updateOps.$inc.wordsLearned = 1;
        updateOps.$inc.wordsLearnedToday = 1;
        updateOps.$set.lastWordLearnDate = now;
    }
    else if (activityType === 'test') {
        gainedXp = 10;
        updateOps.$inc.testsPassed = 1;
        updateOps.$inc.testsTakenToday = 1;
        updateOps.$inc.testXpEarnedToday = 10;
        updateOps.$set.lastTestXpDate = now;
        updateOps.$set.lastTestDate = now;
    }
    else if (activityType === 'text') {
        gainedXp = 30;
    }

    const totalGainedThisTurn = gainedXp + streakBonusXp;

    if (totalGainedThisTurn > 0) {
        updateOps.$inc.xp = totalGainedThisTurn;
        updateOps.$inc.seasonXp = totalGainedThisTurn;
    }

    if (Object.keys(updateOps.$inc).length === 0) {
        delete updateOps.$inc;
    }

    await User.findOneAndUpdate({ telegramId }, updateOps, { returnDocument: 'after' });

    return {
        gainedXp,
        streakBonusXp,
        totalGained: totalGainedThisTurn,
        limitReached: false // Завжди false, бо обмежень більше немає
    };
};