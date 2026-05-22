import mongoose, { Schema, Document } from 'mongoose';

export interface ITopCycle extends Document {
  endDate: Date;
  isActive: boolean;
  seasonNumber: number;
}

const TopCycleSchema: Schema = new Schema({
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  seasonNumber: { type: Number, default: 1 },
});

export const TopCycle = mongoose.model<ITopCycle>('TopCycle', TopCycleSchema);