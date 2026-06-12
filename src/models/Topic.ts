import mongoose, { Schema, Document } from 'mongoose';

export interface ITopic extends Document {
  title: string;
  emoji: string;
}

const TopicSchema: Schema = new Schema({
  title: { type: String, required: true },
  emoji: { type: String, required: true, default: '📚' }
});

export const Topic = mongoose.model<ITopic>('Topic', TopicSchema);