import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseTest {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ICourseLesson {
  title: string;
  theory: string;
  examples: string[];
  tests: ICourseTest[];
}

export interface ICourse extends Document {
  slug: string;
  title: string;
  description: string;
  lessons: ICourseLesson[];
  isPublished: boolean;
  createdAt: Date;
}

const CourseTestSchema = new Schema<ICourseTest>(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    explanation: { type: String },
  },
  { _id: false },
);

const CourseLessonSchema = new Schema<ICourseLesson>(
  {
    title: { type: String, required: true },
    theory: { type: String, required: true },
    examples: { type: [String], default: [] },
    tests: { type: [CourseTestSchema], default: [] },
  },
  { _id: false },
);

const CourseSchema = new Schema<ICourse>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    lessons: { type: [CourseLessonSchema], default: [] },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ✅ ОПТИМІЗАЦІЯ: Індекс для швидкого виведення опублікованих курсів у правильному порядку
CourseSchema.index({ isPublished: 1, createdAt: 1 });

export const Course = mongoose.model<ICourse>('Course', CourseSchema);