import mongoose, { Schema, Document } from 'mongoose';

export interface IText extends Document {
  englishText: string;
  ukrainianTranslation: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
}

const TextSchema: Schema = new Schema({
  englishText: { type: String, required: true },
  ukrainianTranslation: { type: String, required: true },
  level: { type: String, enum: ['A1', 'A2', 'B1', 'B2'], required: true },
});

export const Text = mongoose.model<IText>('Text', TextSchema);