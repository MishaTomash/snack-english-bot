import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseProgress extends Document {
  telegramId: number;
  courseId: mongoose.Types.ObjectId;
  viewedVideos: string[]; 
  completedTests: string[];
}

const CourseProgressSchema = new Schema<ICourseProgress>({
  telegramId: { type: Number, required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  viewedVideos: { type: [String], default: [] },
completedTests: [{ type: String, default: [] }]
});

CourseProgressSchema.index({ telegramId: 1, courseId: 1 }, { unique: true });

export const CourseProgress = mongoose.model<ICourseProgress>('CourseProgress', CourseProgressSchema);