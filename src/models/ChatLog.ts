import mongoose, { Schema, Document } from 'mongoose';

export interface IChatLog extends Document {
  telegramId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const ChatLogSchema: Schema = new Schema({
  telegramId: { type: Number, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

ChatLogSchema.index({ telegramId: 1, createdAt: 1 });

export const ChatLog = mongoose.model<IChatLog>('ChatLog', ChatLogSchema);