import mongoose, { Schema, Document } from 'mongoose';

export interface ITopCycle extends Document {
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  seasonNumber: number;
  totalStars: number;
  winnerTelegramId: number | null;
  winnerUsername: string | null; // ← нове поле
  winnerName: string | null;
  winnerXp: number;
}

const TopCycleSchema: Schema = new Schema({
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  seasonNumber: { type: Number, default: 1 },
  totalStars: { type: Number, default: 0 },
  winnerTelegramId: { type: Number, default: null },
  winnerUsername: { type: String, default: null }, // ← нове поле
  winnerName: { type: String, default: null },
  winnerXp: { type: Number, default: 0 },
});

TopCycleSchema.index(
  { isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export const TopCycle = mongoose.model<ITopCycle>('TopCycle', TopCycleSchema);