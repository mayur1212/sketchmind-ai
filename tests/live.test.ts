import { it, expect } from "vitest";
import { POST as lessonPOST } from "../app/api/lessons/route";
import { POST as chatPOST } from "../app/api/chat/route";
import { lessonSchema } from "../lib/lesson";
it.skipIf(process.env.LIVE_AI !== "1")(
  "generates a real lesson, contextual answer, and optional visual follow-up",
  async () => {
    const response = await lessonPOST(
      new Request("http://localhost/api/lessons", {
        method: "POST",
        body: JSON.stringify({ topic: "JavaScript Closures" }),
      }),
    );
    const data = await response.json();
    expect(response.status, JSON.stringify(data)).toBe(200);
    const lesson = lessonSchema.parse(data);
    expect(lesson.steps.length).toBeGreaterThanOrEqual(3);
    const chat = await chatPOST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          topic: lesson.topic,
          summary: lesson.summary,
          history: [],
          question: "Why does the inner function remember the variable?",
        }),
      }),
    );
    const answer = await chat.json();
    expect(chat.status, JSON.stringify(answer)).toBe(200);
    expect(answer.answer.length).toBeGreaterThan(20);
    const visual = await lessonPOST(
      new Request("http://localhost/api/lessons", {
        method: "POST",
        body: JSON.stringify({
          topic: lesson.topic,
          followUp: {
            question: "Why does the inner function remember the variable?",
            summary: lesson.summary,
            answer: answer.answer,
          },
        }),
      }),
    );
    const explanation = await visual.json();
    expect(visual.status, JSON.stringify(explanation)).toBe(200);
    expect(lessonSchema.safeParse(explanation).success).toBe(true);
  },
  180000,
);
