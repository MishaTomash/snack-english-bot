import mongoose, { Schema, Document } from 'mongoose';

export interface ITopCycle extends Document {
  endDate: Date;
  isActive: boolean;
  seasonNumber: number;
  totalStars: number; // 💰 Справжні зароблені зірки
}

const TopCycleSchema: Schema = new Schema({
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  seasonNumber: { type: Number, default: 1 },
  totalStars: { type: Number, default: 0 }, // За замовчуванням 0 на початку сезону
});

export const TopCycle = mongoose.model<ITopCycle>('TopCycle', TopCycleSchema);