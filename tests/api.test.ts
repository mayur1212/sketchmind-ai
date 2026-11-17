import { beforeEach, describe, it, expect, vi } from "vitest";
import { demo } from "../lib/demo";
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));
import { POST as lessonPOST } from "../app/api/lessons/route";
import { POST as chatPOST } from "../app/api/chat/route";
const generatedFixture = {
  ...demo,
  steps: Array.from({ length: 6 }, (_, i) => ({
    ...demo.steps[i % 3],
    id: `generated-${i}`,
    narration: Array(55).fill("explanation").join(" "),
  })),
};
function req(body: unknown) {
  return new Request("http://localhost/api/lessons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
describe("real route contract with mocked external Gemini", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "unit-test-only";
    generateContent.mockReset();
  });
  it("validates generated lessons", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify(generatedFixture),
    });
    const res = await lessonPOST(req({ topic: "JavaScript Closure" }));
    expect(res.status).toBe(200);
    expect((await res.json()).title).toBe(demo.title);
    expect(generateContent).toHaveBeenCalledOnce();
  });
  it("rejects malformed model JSON", async () => {
    generateContent.mockResolvedValue({ text: "not JSON" });
    const res = await lessonPOST(req({ topic: "JavaScript Closure" }));
    expect(res.status).toBe(502);
  });
  it("handles missing credentials without generating fake lessons", async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await lessonPOST(req({ topic: "Closures" }));
    expect(res.status).toBe(503);
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("rejects empty input before calling the provider", async () => {
    const res = await lessonPOST(req({ topic: "" }));
    expect(res.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("passes bounded lesson context for follow-ups", async () => {
    generateContent.mockResolvedValue({
      text: "The lexical environment remains reachable.",
    });
    const res = await chatPOST(
      req({
        topic: "Closures",
        summary: demo.summary,
        history: [],
        question: "Why is count remembered?",
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).answer).toContain("lexical environment");
  });
  it("does not expose provider error internals", async () => {
    generateContent.mockRejectedValue({
      status: 403,
      message: "secret detail",
    });
    const res = await lessonPOST(req({ topic: "Closure" }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret detail");
  });
  it("rejects cross-origin requests", async () => {
    const res = await lessonPOST(
      new Request("http://localhost/api/lessons", {
        method: "POST",
        headers: { origin: "https://other.example" },
        body: JSON.stringify({ topic: "Closure" }),
      }),
    );
    expect(res.status).toBe(403);
  });
  it("rejects oversized input while reading the request", async () => {
    const res = await lessonPOST(req({ topic: "x".repeat(25000) }));
    expect(res.status).toBe(413);
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("limits repeated requests per client", async () => {
    let res: Response | undefined;
    for (let i = 0; i < 13; i++)
      res = await lessonPOST(
        new Request("http://localhost/api/lessons", {
          method: "POST",
          headers: { "x-forwarded-for": "rate-test-client" },
          body: JSON.stringify({ topic: "" }),
        }),
      );
    expect(res!.status).toBe(429);
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("generates a visual follow-up using its original lesson and answer context", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify(generatedFixture),
    });
    const question =
      "Can you explain how lexical environments preserve a variable after a function returns?";
    const res = await lessonPOST(
      req({
        topic: demo.topic,
        followUp: {
          question,
          summary: demo.summary,
          answer:
            "The returned function retains a reference to its environment.",
        },
      }),
    );
    expect(res.status).toBe(200);
    const prompt = generateContent.mock.calls[0][0].contents;
    expect(prompt).toContain(question);
    expect(prompt).toContain(demo.summary);
    expect(prompt).toContain("new visual explanation");
  });
  it("rejects oversized follow-up context before calling Gemini", async () => {
    const res = await lessonPOST(
      req({
        topic: demo.topic,
        followUp: {
          question: "x".repeat(1201),
          summary: demo.summary,
          answer: "A valid answer.",
        },
      }),
    );
    expect(res.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("regenerates a short narration instead of returning a one-minute lesson", async () => {
    generateContent
      .mockResolvedValueOnce({ text: JSON.stringify(demo) })
      .mockResolvedValueOnce({ text: JSON.stringify(generatedFixture) });
    const response = await lessonPOST(
      new Request("http://localhost/api/lessons", {
        method: "POST",
        headers: { "x-forwarded-for": "quality-test" },
        body: JSON.stringify({ topic: "Closures" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[1][0].contents).toContain(
      "previous attempt failed validation",
    );
  });
  it("returns a safe error if regenerated narration remains too short", async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify(demo) });
    const response = await lessonPOST(
      new Request("http://localhost/api/lessons", {
        method: "POST",
        headers: { "x-forwarded-for": "short-lesson-test" },
        body: JSON.stringify({ topic: "Closures" }),
      }),
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain("two-minute lesson");
  });
});
