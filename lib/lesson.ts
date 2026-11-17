import { z } from "zod";
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const elementSchema = z
  .object({
    id: z.string().min(1).max(60),
    type: z.enum([
      "text",
      "rectangle",
      "circle",
      "line",
      "arrow",
      "highlight",
      "fraction",
    ]),
    x: z.number().min(0).max(900),
    y: z.number().min(0).max(540),
    width: z.number().min(-900).max(960),
    height: z.number().min(-540).max(600),
    text: z.string().max(240),
    color,
    fill: color,
    fontSize: z.number().min(14).max(42),
    numerator: z.number().int().min(0).max(12).optional(),
    denominator: z.number().int().min(1).max(12).optional(),
  })
  .superRefine((e, ctx) => {
    if (
      e.type === "fraction" &&
      (e.numerator === undefined ||
        e.denominator === undefined ||
        e.numerator > e.denominator)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Fraction needs a numerator and denominator with 0 <= numerator <= denominator <= 12",
      });
    const isLine = e.type === "line" || e.type === "arrow";
    if (!isLine && (e.width < 20 || e.height < 20))
      ctx.addIssue({
        code: "custom",
        message: "Shape must have a visible size",
      });
    if (isLine && e.width === 0 && e.height === 0)
      ctx.addIssue({
        code: "custom",
        message: "Line must have a visible length",
      });
    if (
      e.x + e.width > 960 ||
      e.y + e.height > 600 ||
      e.x + e.width < 0 ||
      e.y + e.height < 0
    )
      ctx.addIssue({ code: "custom", message: "Element exceeds canvas" });
  });
export const lessonSchema = z
  .object({
    title: z.string().min(1).max(120),
    topic: z.string().min(1).max(240),
    objective: z.string().max(500),
    steps: z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          title: z.string().max(100),
          narration: z.string().min(10).max(2500),
          estimatedDurationSeconds: z.number().min(5).max(60),
          elements: z.array(elementSchema).min(1).max(18),
        }),
      )
      .min(3)
      .max(10),
    summary: z.string().max(1500),
    suggestedQuestions: z.array(z.string().max(180)).min(1).max(4),
  })
  .superRefine((l, ctx) => {
    if (new Set(l.steps.map((s) => s.id)).size !== l.steps.length)
      ctx.addIssue({ code: "custom", message: "Duplicate step IDs" });
    for (const s of l.steps)
      if (new Set(s.elements.map((e) => e.id)).size !== s.elements.length)
        ctx.addIssue({ code: "custom", message: "Duplicate element IDs" });
  });
export type Lesson = z.infer<typeof lessonSchema>;
export type DiagramElement = z.infer<typeof elementSchema>;
export const followUpContextSchema = z.object({
  question: z.string().trim().min(2).max(1200),
  summary: z.string().max(1500),
  answer: z.string().min(1).max(3000),
});
export type FollowUpContext = z.infer<typeof followUpContextSchema>;
export const topicSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(2, "Enter a topic with at least 2 characters.")
    .max(240),
  level: z.literal("beginner").optional(),
  followUp: followUpContextSchema.optional(),
});
export const chatSchema = z.object({
  topic: z.string().max(240),
  summary: z.string().max(1500),
  question: z.string().trim().min(2).max(1200),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(3000),
      }),
    )
    .max(10),
});
export function stepIndex(index: number, count: number) {
  return Math.max(0, Math.min(index, count - 1));
}
