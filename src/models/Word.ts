import mongoose, { Schema, Document } from 'mongoose';

export interface IWord extends Document {
  english: string;
  ukrainian: string;
  transcription: string;
  level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topicId?: mongoose.Types.ObjectId;
}

const WordSchema: Schema = new Schema({
  english: { type: String, required: true },
  ukrainian: { type: String, required: true },
  transcription: { type: String, required: true },
  level: { type: String, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], required: false },
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic', default: null }
});

export const Word = mongoose.model<IWord>('Word', WordSchema);