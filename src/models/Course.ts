import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICourseVideo {
  _id: Types.ObjectId;
  title: string;
  url: string;
  order: number;
}

export interface ICourseTestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ICourseTestCategory {
  _id: Types.ObjectId;
  title: string;
  questions: ICourseTestQuestion[];
}

export interface ICourse extends Document {
  title: string;
  emoji: string;
  isPremium: boolean;
  videos: ICourseVideo[];
  tests: ICourseTestCategory[];
}

const CourseVideoSchema = new Schema<ICourseVideo>({
  title: { type: String, required: true },
  url: { type: String, required: true },
  order: { type: Number, default: 0 }
});

const CourseTestQuestionSchema = new Schema<ICourseTestQuestion>({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true },
  explanation: { type: String }
}, { _id: false });

const CourseTestCategorySchema = new Schema<ICourseTestCategory>({
  title: { type: String, required: true },
  questions: { type: [CourseTestQuestionSchema], default: [] }
});

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  emoji: { type: String, default: '📘' },
  isPremium: { type: Boolean, default: false },
  videos: { type: [CourseVideoSchema], default: [] },
  tests: { type: [CourseTestCategorySchema], default: [] }
});

export const Course = mongoose.model<ICourse>('Course', CourseSchema);