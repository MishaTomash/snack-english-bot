import mongoose, { Schema, Document } from 'mongoose';

export interface ISentenceExercise extends Document {
  sentence: string;       // "I am working"
  translation: string;    // "Я зараз працюю"
  explanation?: string;   // "Present Continuous — дія що відбувається зараз"
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  isActive: boolean;
  createdAt: Date;
}

const SentenceExerciseSchema = new Schema({
  sentence:    { type: String, required: true, trim: true },
  translation: { type: String, required: true, trim: true },
  explanation: { type: String, trim: true },
  level:       { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

export const SentenceExercise = mongoose.model<ISentenceExercise>('SentenceExercise', SentenceExerciseSchema);