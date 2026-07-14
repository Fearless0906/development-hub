import { QuizData, QuizQuestion } from "@/components/learning/Quiz";
import { CodingChallengeData } from "@/components/learning/CodingChallenge";

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  duration: string | null;
  video_url: string | null;
  order_index: number;
  completion_rule: "manual" | "read" | "quiz" | "challenge";
  quiz: QuizQuestion[] | QuizData | null;
  challenge: CodingChallengeData | null;
  is_published: boolean;
  completed?: boolean;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  completion_rule: "manual" | "read" | "quiz" | "challenge";
  is_published: boolean;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string | null;
  icon: string | null;
  thumbnail_url: string | null;
  students_count: number;
  rating: number | null;
  instructor_name: string | null;
  instructor_avatar: string | null;
  instructor_title: string | null;
  topics: string[] | null;
  learn_outcomes: string[];
  prerequisites: string[];
  projects_included: string[];
  is_progressive: boolean;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseWithModules extends Course {
  course_modules: CourseModule[];
}

export interface UserCourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  completed_lessons: string[];
  last_lesson_id: string | null;
  progress_percent: number;
  completion_rule: "manual" | "read" | "quiz" | "challenge";
  is_published: boolean;
  started_at: string;
  completed_at: string | null;
}
