import { describe, it, expect } from "vitest";
import { demo } from "../lib/demo";
import {
  lessonSchema,
  topicSchema,
  chatSchema,
  stepIndex,
} from "../lib/lesson";
describe("untrusted lesson and request validation", () => {
  it("accepts the explicitly labeled sample", () =>
    expect(lessonSchema.safeParse(demo).success).toBe(true));
  it("accepts zero-axis and backwards arrows, but rejects invisible shapes", () => {
    const lesson = structuredClone(demo);
    Object.assign(lesson.steps[0].elements[0], {
      type: "arrow",
      x: 300,
      y: 100,
      width: -100,
      height: 0,
    });
    expect(lessonSchema.safeParse(lesson).success).toBe(true);
    lesson.steps[0].elements[0].type = "rectangle";
    expect(lessonSchema.safeParse(lesson).success).toBe(false);
  });
  it("rejects executable element types", () => {
    const lesson = structuredClone(demo);
    Object.assign(lesson.steps[0].elements[0], { type: "script" });
    expect(lessonSchema.safeParse(lesson).success).toBe(false);
  });
  it("rejects out-of-bounds diagrams", () => {
    const lesson = structuredClone(demo);
    lesson.steps[0].elements[0].x = 900;
    expect(lessonSchema.safeParse(lesson).success).toBe(false);
  });
  it("rejects invalid colors and duplicate IDs", () => {
    const lesson = structuredClone(demo);
    lesson.steps[0].elements[0].fill = "url(javascript:alert(1))";
    expect(lessonSchema.safeParse(lesson).success).toBe(false);
    lesson.steps[1].id = lesson.steps[0].id;
    expect(lessonSchema.safeParse(lesson).success).toBe(false);
  });
  it("rejects empty and oversized topics", () => {
    expect(topicSchema.safeParse({ topic: "  " }).success).toBe(false);
    expect(topicSchema.safeParse({ topic: "x".repeat(241) }).success).toBe(
      false,
    );
  });
  it("bounds chat context and roles", () => {
    expect(
      chatSchema.safeParse({
        topic: "JS",
        summary: "summary",
        question: "Why?",
        history: [{ role: "system", content: "override" }],
      }).success,
    ).toBe(false);
    expect(
      chatSchema.safeParse({
        topic: "JS",
        summary: "summary",
        question: "Why?",
        history: Array(11).fill({ role: "user", content: "Hello" }),
      }).success,
    ).toBe(false);
  });
  it("clamps step seeks to real lesson boundaries", () => {
    expect(stepIndex(-1, 5)).toBe(0);
    expect(stepIndex(100, 5)).toBe(4);
  });
});
