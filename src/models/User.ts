import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    telegramId: number;
    level?: string;
    streak?: number;
    lastActive?: Date;
    wordsLearned?: number;
    testsPassed?: number;
    // Freemium 💎
    isPremium: boolean;
    premiumExpiresAt?: Date;          // aliases: premiumUntil
    wordsLearnedToday: number;
    lastWordLearnDate?: Date;
    // Carry-over невивчених слів
    carriedOverWords: number;
    // Нагадування
    reminderTime?: string;            // формат "HH:MM", напр. "10:00"
    lastActivityDate?: Date;
    // Чищення аудіо-спаму 🧹
    lastAudioMessageId?: number | null;
    learnedWordIds?: string[];
    savedWords: mongoose.Types.ObjectId[];
    username?: string;
    firstName?: string;
    seenWords: Schema.Types.ObjectId[];
    seenTexts: Schema.Types.ObjectId[];
    seenTests: Schema.Types.ObjectId[];
    seenLearnedTests: Schema.Types.ObjectId[];  // ← ДОДАЙ ЦЕ

}

const UserSchema: Schema = new Schema({
    telegramId: { type: Number, required: true, unique: true },
    level: { type: String },
    streak: { type: Number, default: 0 },
    lastActive: { type: Date },
    wordsLearned: { type: Number, default: 0 },
    testsPassed: { type: Number, default: 0 },
    // Freemium
    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date },
    wordsLearnedToday: { type: Number, default: 0 },
    lastWordLearnDate: { type: Date },
    // Carry-over: скільки невикористаних слотів перенесено з попереднього дня (max 3)
    carriedOverWords: { type: Number, default: 0 },
    // Нагадування (рядок "HH:MM" в UTC або локальному tz користувача)
    reminderTime: { type: String },
    lastActivityDate: { type: Date },
    lastAudioMessageId: { type: Number, default: null },
    learnedWordIds: { type: [String], default: [] },
    savedWords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Word' }],
    username: { type: String },
    firstName: { type: String },
    seenWords: { type: [Schema.Types.ObjectId], default: [] },
    seenTexts: { type: [Schema.Types.ObjectId], default: [] },
    seenTests: { type: [Schema.Types.ObjectId], default: [] },
    seenLearnedTests: { type: [Schema.Types.ObjectId], default: [] }, 
});

export const User = mongoose.model<IUser>('User', UserSchema);