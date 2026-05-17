import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    telegramId: number;
    level?: string;
    streak?: number;
    lastActive?: Date;
    wordsLearned?: number;
    testsPassed?: number;
    // Нові поля для системи Freemium 💎
    isPremium: boolean;
    wordsLearnedToday: number;
    lastWordLearnDate?: Date;
}

const UserSchema: Schema = new Schema({
    telegramId: { type: Number, required: true, unique: true },
    level: { type: String },
    streak: { type: Number, default: 0 },
    lastActive: { type: Date },
    wordsLearned: { type: Number, default: 0 },
    testsPassed: { type: Number, default: 0 },
    // Налаштування Freemium 💎
    isPremium: { type: Boolean, default: false },
    wordsLearnedToday: { type: Number, default: 0 },
    lastWordLearnDate: { type: Date }
});

export const User = mongoose.model<IUser>('User', UserSchema);