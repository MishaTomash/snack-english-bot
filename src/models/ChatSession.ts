import mongoose, { Schema, Document } from 'mongoose';

export interface IChatSession extends Document {
  telegramId: number;
  isActive: boolean;
  isPaused: boolean;
  topic: string;
  startedAt: Date;
  messageCount: number;
}

const ChatSessionSchema: Schema = new Schema({
  telegramId: { type: Number, required: true, unique: true },
  isActive: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
  topic: { type: String, default: '' },
  startedAt: { type: Date },
  messageCount: { type: Number, default: 0 },
});

ChatSessionSchema.index({ telegramId: 1 });

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);