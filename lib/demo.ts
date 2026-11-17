import { Lesson } from "./lesson";
const box = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  fill = "#f2edff",
) => ({
  id,
  type: "rectangle" as const,
  x,
  y,
  width,
  height,
  text,
  fill,
  color: "#8957e5",
  fontSize: 22,
});
export const demo: Lesson = {
  title: "The little idea behind closures",
  topic: "JavaScript Closures",
  objective:
    "Understand how a function remembers the environment where it was created.",
  summary:
    "A closure is a function together with access to its lexical environment. Returned functions can keep using variables from an outer call, even after that call has finished.",
  suggestedQuestions: [
    "Why does the variable stay alive?",
    "Can you show a practical example?",
    "How are closures used in React?",
  ],
  steps: [
    {
      id: "environment",
      title: "Every function has a home",
      estimatedDurationSeconds: 25,
      narration:
        "Think of a function as a person carrying a backpack. When you create a function, it keeps access to the variables around it. In JavaScript, we call this surrounding scope its lexical environment. A closure combines the function with that environment.",
      elements: [
        box("outer", 100, 80, 760, 380, "", "#faf8ff"),
        {
          ...box("label", 140, 110, 650, 60, "The outer function’s scope"),
          type: "text",
        },
        box("variable", 150, 220, 250, 90, "count = 0"),
        box("inner", 500, 220, 300, 140, "inner function\nremembers count"),
      ],
    },
    {
      id: "returned",
      title: "The outer call finishes",
      estimatedDurationSeconds: 25,
      narration:
        "Imagine an outer function named createCounter. It creates a count variable and returns an inner function. The outer call finishes, but the inner function still has access to the count from that particular call. Returning a function does not erase its environment.",
      elements: [
        box("factory", 70, 170, 300, 150, "createCounter()\ncreates count"),
        { ...box("arrow", 380, 240, 120, 20, ""), type: "arrow" },
        box(
          "returned",
          530,
          170,
          350,
          150,
          "returned function\n+ remembered scope",
        ),
      ],
    },
    {
      id: "counter",
      title: "One private, persistent counter",
      estimatedDurationSeconds: 25,
      narration:
        "Each time you call the returned function, it can increment the same count. The first call returns one. The next returns two. This is useful for private state: callers can use the counter without directly changing its count variable. Separate createCounter calls create separate environments.",
      elements: [
        box("one", 70, 200, 230, 110, "counter() → 1"),
        box("two", 360, 200, 230, 110, "counter() → 2"),
        box("three", 650, 200, 230, 110, "same environment"),
        {
          ...box(
            "takeaway",
            150,
            390,
            680,
            80,
            "A function remembers where it was created.",
          ),
          type: "text",
        },
      ],
    },
  ],
};
