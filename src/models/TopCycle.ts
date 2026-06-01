import mongoose, { Schema, Document } from 'mongoose';

export interface ITopCycle extends Document {
  endDate: Date;
  isActive: boolean;
  seasonNumber: number;
  totalStars: number;
}

const TopCycleSchema: Schema = new Schema({
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  seasonNumber: { type: Number, default: 1 },
  totalStars: { type: Number, default: 0 },
});

// ✅ ОПТИМІЗАЦІЯ: Індекс для швидкого пошуку активного сезону та гарантія його єдиності
TopCycleSchema.index(
  { isActive: 1 }, 
  { unique: true, partialFilterExpression: { isActive: true } }
);

export const TopCycle = mongoose.model<ITopCycle>('TopCycle', TopCycleSchema);