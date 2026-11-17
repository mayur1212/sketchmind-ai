import { describe, it, expect } from "vitest";
import { demo } from "../lib/demo";
import {
  prepareGeneratedLesson,
  narrationWordCount,
} from "../lib/lessonQuality";
import { elementSchema } from "../lib/lesson";
describe("two-minute lesson quality gate", () => {
  it("rejects the short explicit demo as a live generated lesson", () =>
    expect(() => prepareGeneratedLesson(demo)).toThrow("words"));
  it("derives duration estimates from actual narration, not provider guesses", () => {
    const fixture = {
      ...demo,
      steps: Array.from({ length: 6 }, (_, i) => ({
        ...demo.steps[i % 3],
        id: `step-${i}`,
        estimatedDurationSeconds: 60,
        narration: Array(55).fill("word").join(" "),
      })),
    };
    const result = prepareGeneratedLesson(fixture);
    expect(narrationWordCount(result)).toBe(330);
    expect(
      result.steps.reduce((n, s) => n + s.estimatedDurationSeconds, 0),
    ).toBe(126);
  });
  it("rejects overlong narration instead of pretending it is two minutes", () => {
    const fixture = {
      ...demo,
      steps: demo.steps.map((s) => ({
        ...s,
        narration: Array(140).fill("word").join(" "),
      })),
    };
    expect(() => prepareGeneratedLesson(fixture)).toThrow("words");
  });
  it("accepts a partitioned fraction and rejects impossible values", () => {
    const fraction = {
      ...demo.steps[0].elements[0],
      type: "fraction",
      numerator: 1,
      denominator: 2,
    };
    expect(elementSchema.safeParse(fraction).success).toBe(true);
    expect(elementSchema.safeParse({ ...fraction, numerator: 3 }).success).toBe(
      false,
    );
    expect(
      elementSchema.safeParse({ ...fraction, denominator: 0 }).success,
    ).toBe(false);
  });
});
