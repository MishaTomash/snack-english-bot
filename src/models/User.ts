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
    premiumExpiresAt?: Date; 
    wordsLearnedToday: number;
    lastWordLearnDate?: Date;
    // Поле для очищення чату від аудіо-спаму 🧹
    lastAudioMessageId?: number | null;
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
    premiumExpiresAt: { type: Date }, 
    wordsLearnedToday: { type: Number, default: 0 },
    lastWordLearnDate: { type: Date },
    // Зберігаємо ID останнього голосового повідомлення
    lastAudioMessageId: { type: Number, default: null }
});

export const User = mongoose.model<IUser>('User', UserSchema);