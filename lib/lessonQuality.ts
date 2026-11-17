import { lessonSchema, type Lesson } from "./lesson";
export const MIN_NARRATION_WORDS = 300;
export const MAX_NARRATION_WORDS = 370;
// Calibrated against the native English voice used in the audit; device voices vary.
export const NARRATION_WORDS_PER_MINUTE = 160;
export function wordCount(text: string) {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}
export function narrationWordCount(lesson: Lesson) {
  return lesson.steps.reduce(
    (total, step) => total + wordCount(step.narration),
    0,
  );
}
export function prepareGeneratedLesson(value: unknown): Lesson {
  const lesson = lessonSchema.parse(value);
  const words = narrationWordCount(lesson);
  if (words < MIN_NARRATION_WORDS || words > MAX_NARRATION_WORDS)
    throw new Error(
      `Narration has ${words} words; rewrite it to contain ${MIN_NARRATION_WORDS}–${MAX_NARRATION_WORDS} words in total. Aim for 330 words across 6 teaching steps. Add useful examples and explanations, never filler or repetitions.`,
    );
  if (lesson.steps.some((s) => wordCount(s.narration) > 110))
    throw new Error(
      "Distribute the narration across steps; each step must have at most 110 words.",
    );
  return {
    ...lesson,
    steps: lesson.steps.map((step) => ({
      ...step,
      estimatedDurationSeconds: Math.max(
        5,
        Math.round(
          (wordCount(step.narration) / NARRATION_WORDS_PER_MINUTE) * 60,
        ),
      ),
    })),
  };
}
