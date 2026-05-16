import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  firstName?: string;
  level?: 'A1' | 'A2' | 'B1' | 'B2';
  isPremium: boolean;
  wordsLearned: number;
  testsPassed: number;
  streakDays: number;
  lastActive: Date;
}

const UserSchema: Schema = new Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: { type: String },
  level: { type: String, enum: ['A1', 'A2', 'B1', 'B2'] },
  isPremium: { type: Boolean, default: false }, // Для freemium моделі
  wordsLearned: { type: Number, default: 0 },
  testsPassed: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);