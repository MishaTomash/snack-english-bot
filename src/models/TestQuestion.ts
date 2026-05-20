import mongoose, { Schema, Document } from 'mongoose';

export interface ITestQuestion extends Document {
  question: string;
  options: string[]; // Наприклад: ['school', 'water', 'window', 'bread']
  correctOptionIndex: number; // Індекс правильної відповіді (наприклад, 1 для 'water')
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

const TestQuestionSchema: Schema = new Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctOptionIndex: { type: Number, required: true },
  level: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], required: true },
});

export const TestQuestion = mongoose.model<ITestQuestion>('TestQuestion', TestQuestionSchema);