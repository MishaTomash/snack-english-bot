import mongoose, { Schema, Document } from 'mongoose';

export interface IWord extends Document {
  english: string;
  ukrainian: string;
  transcription: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
}

const WordSchema: Schema = new Schema({
  english: { type: String, required: true },
  ukrainian: { type: String, required: true },
  transcription: { type: String, required: true },
  level: { type: String, enum: ['A1', 'A2', 'B1', 'B2'], required: true },
});

export const Word = mongoose.model<IWord>('Word', WordSchema);