import type { Lesson } from "./lesson";
export type FollowUpSource = {
  topic: string;
  summary: string;
  question: string;
  answer: string;
};
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  followUp?: FollowUpSource;
  explanation?: Lesson;
};
