import mongoose, { Schema, Document } from 'mongoose';

export interface ITestQuestion extends Document {
  question: string;
  options: string[];
  correctOptionIndex: number;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  wordId?: mongoose.Types.ObjectId;
  explanation?: string;
}

const TestQuestionSchema: Schema = new Schema({
  question:           { type: String, required: true },
  options:            { type: [String], required: true },
  correctOptionIndex: { type: Number, required: true },
  level:              { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], required: true },
  wordId:             { type: Schema.Types.ObjectId, ref: 'Word', default: null },
  explanation:        { type: String, default: null },
});

// ✅ ОПТИМІЗАЦІЯ: Складений індекс. Прискорює запит { level: 'A1', wordId: null } у десятки разів
TestQuestionSchema.index({ level: 1, wordId: 1 });

export const TestQuestion = mongoose.model<ITestQuestion>('TestQuestion', TestQuestionSchema);