import mongoose, { Schema, Document } from 'mongoose';

export interface ITestQuestion extends Document {
  question: string;
  options: string[];
  correctOptionIndex: number;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  // Прив'язка до конкретного слова (необов'язково — загальні тести не мають wordId)
  wordId?: mongoose.Types.ObjectId;
}

const TestQuestionSchema: Schema = new Schema({
  question:           { type: String, required: true },
  options:            { type: [String], required: true },
  correctOptionIndex: { type: Number, required: true },
  level:              { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], required: true },
  wordId:             { type: Schema.Types.ObjectId, ref: 'Word', default: null },
});

// Індекс для швидкого пошуку тестів за wordId
TestQuestionSchema.index({ wordId: 1 });

export const TestQuestion = mongoose.model<ITestQuestion>('TestQuestion', TestQuestionSchema);