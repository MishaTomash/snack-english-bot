import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseProgress extends Document {
  telegramId: number;
  courseSlug: string;
  currentLesson: number;   // індекс уроку (0-based)
  completed: boolean;
  reviewDate?: Date;       // коли нагадати повторити
  purchasedAt?: Date;      // коли куплено (null = безкоштовний)
}

const CourseProgressSchema = new Schema<ICourseProgress>(
  {
    telegramId: { type: Number, required: true },
    courseSlug: { type: String, required: true },
    currentLesson: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    reviewDate: { type: Date },
    purchasedAt: { type: Date },
  },
  { timestamps: true },
);

// Один запис на юзера + курс
CourseProgressSchema.index({ telegramId: 1, courseSlug: 1 }, { unique: true });

export const CourseProgress = mongoose.model<ICourseProgress>('CourseProgress', CourseProgressSchema);