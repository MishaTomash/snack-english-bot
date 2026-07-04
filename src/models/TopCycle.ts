import mongoose, { Schema, Document } from 'mongoose';

// ✅ Один переможець у топ-3
export interface ITopCycleWinner {
  place: number; // 1, 2, 3
  telegramId: number;
  username: string | null;
  name: string;
  xp: number;
  stars: number; // 50 за 1 місце, 25 за 2 і 3
}

export interface ITopCycle extends Document {
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  seasonNumber: number;
  totalStars: number;
  winners: ITopCycleWinner[]; // ← нове: топ-3 переможці сезону

  // ⚠️ Legacy-поля, залишені для сумісності (дзеркалять winners[0] — 1 місце)
  winnerTelegramId: number | null;
  winnerUsername: string | null;
  winnerName: string | null;
  winnerXp: number;
}

const TopCycleWinnerSchema = new Schema<ITopCycleWinner>(
  {
    place: { type: Number, required: true },
    telegramId: { type: Number, required: true },
    username: { type: String, default: null },
    name: { type: String, required: true },
    xp: { type: Number, required: true },
    stars: { type: Number, required: true },
  },
  { _id: false }
);

const TopCycleSchema: Schema = new Schema({
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  seasonNumber: { type: Number, default: 1 },
  totalStars: { type: Number, default: 0 },
  winners: { type: [TopCycleWinnerSchema], default: [] },

  // Legacy-поля (дзеркало 1 місця, не видаляємо, щоб не зламати старий код/дані)
  winnerTelegramId: { type: Number, default: null },
  winnerUsername: { type: String, default: null },
  winnerName: { type: String, default: null },
  winnerXp: { type: Number, default: 0 },
});

TopCycleSchema.index(
  { isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export const TopCycle = mongoose.model<ITopCycle>('TopCycle', TopCycleSchema);