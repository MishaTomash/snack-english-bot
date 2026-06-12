import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    telegramId: number;
    level?: string;
    streak?: number;
    lastActive?: Date;
    wordsLearned?: number;
    testsPassed?: number;
    xp: number;
    isPremium: boolean;
    premiumExpiresAt?: Date;
    wordsLearnedToday: number;
    lastWordLearnDate?: Date;
    carriedOverWords: number;
    reminderTime?: string;
    lastActivityDate?: Date;
    testXpEarnedToday: number;
    lastTestXpDate?: Date;
    lastAudioMessageId?: number | null;
    learnedWordIds?: string[];
    savedWords: mongoose.Types.ObjectId[];
    username?: string;
    firstName?: string;
    // ⚠️ Увага: Ці масиви з часом треба буде винести в окрему колекцію або Redis
    seenWords: Schema.Types.ObjectId[];
    seenTexts: Schema.Types.ObjectId[];
    seenTests: Schema.Types.ObjectId[];
    seenLearnedTests: Schema.Types.ObjectId[];
    seasonXp: number;
    referredBy?: number;
    referralCount: number;
    referralRewardClaimed: boolean;
    hasCompletedMinAction: boolean;
    isBlocked: boolean;
    lastRemindedAt: Date;
    freeTopicWordsLearned: number;
    seenTopicWords: Schema.Types.ObjectId[];
    testsTakenToday: number;
    lastTestDate?: Date;
}

const UserSchema: Schema = new Schema({
    telegramId: { type: Number, required: true, unique: true },
    level: { type: String },
    streak: { type: Number, default: 0 },
    lastActive: { type: Date },
    wordsLearned: { type: Number, default: 0 },
    testsPassed: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date },
    wordsLearnedToday: { type: Number, default: 0 },
    lastWordLearnDate: { type: Date },
    carriedOverWords: { type: Number, default: 0 },
    reminderTime: { type: String },
    lastActivityDate: { type: Date },
    testXpEarnedToday: { type: Number, default: 0 },
    lastTestXpDate: { type: Date },
    lastAudioMessageId: { type: Number, default: null },
    learnedWordIds: { type: [String], default: [] },
    savedWords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Word' }],
    username: { type: String },
    firstName: { type: String },
    seenWords: { type: [Schema.Types.ObjectId], default: [] },
    seenTexts: { type: [Schema.Types.ObjectId], default: [] },
    seenTests: { type: [Schema.Types.ObjectId], default: [] },
    seenLearnedTests: { type: [Schema.Types.ObjectId], default: [] },
    seasonXp: { type: Number, default: 0 },
    referredBy: { type: Number },
    referralCount: { type: Number, default: 0 },
    referralRewardClaimed: { type: Boolean, default: false },
    hasCompletedMinAction: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    lastRemindedAt: { type: Date },
    freeTopicWordsLearned: { type: Number, default: 0 },
    seenTopicWords: { type: [Schema.Types.ObjectId], default: [] },
    testsTakenToday: { type: Number, default: 0 },
    lastTestDate: { type: Date },
});

// ✅ ОПТИМІЗАЦІЯ: Складені індекси для швидких запитів
UserSchema.index({ isPremium: 1, seasonXp: -1 }); // Миттєва генерація ТОПу
UserSchema.index({ reminderTime: 1 }); // Швидкий пошук для крону нагадування слів
UserSchema.index({ isPremium: 1, premiumExpiresAt: 1 }); // Швидкий пошук для крону Premium
UserSchema.index({ lastActive: 1, isBlocked: 1, lastRemindedAt: 1 }); // Швидкий пошук для крону активності

export const User = mongoose.model<IUser>('User', UserSchema);