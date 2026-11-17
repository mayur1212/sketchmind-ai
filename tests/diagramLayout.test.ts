import { describe, it, expect } from "vitest";
import { layoutDiagram, labelBounds } from "../lib/diagramLayout";
import { elementSchema, type DiagramElement } from "../lib/lesson";
const box = (
  id: string,
  x: number,
  y: number,
  width = 220,
  height = 140,
  text = id,
): DiagramElement => ({
  id,
  type: "rectangle",
  x,
  y,
  width,
  height,
  text,
  color: "#7625ad",
  fill: "#190f25",
  fontSize: 22,
});
describe("diagram overlap repair", () => {
  it("separates colliding sibling boxes without changing source data", () => {
    const source = [box("a", 50, 80), box("b", 160, 100)];
    const result = layoutDiagram(source);
    expect(result[0].x + result[0].width).toBeLessThan(result[1].x);
    expect(source[0].x).toBe(50);
    expect(source[1].x).toBe(160);
  });
  it("reserves a separate title band above nested content", () => {
    const result = layoutDiagram([
      box("parent", 40, 40, 800, 480),
      box("child", 60, 55),
    ]);
    expect(result[1].y).toBeGreaterThanOrEqual(result[0].y + 64);
    const title = labelBounds(result[0], result);
    expect(title.y + title.height).toBeLessThan(result[1].y);
  });
  it("preserves a clear diagram and its intentional nesting", () => {
    const source = [box("parent", 40, 40, 800, 480), box("child", 100, 140)];
    expect(layoutDiagram(source)).toEqual(source);
  });
  it("fits circular labels inside the ellipse", () => {
    const circle = {
      ...box("circle", 100, 100, 180, 180),
      type: "circle" as const,
    };
    const label = labelBounds(circle, [circle]);
    expect(label.width).toBeLessThan(circle.width);
    expect(label.x).toBeGreaterThan(circle.x);
  });
  it("keeps every post-layout element in bounds for deeply nested valid input", () => {
    const input = [
      box("p", 100, 420, 500, 180),
      box("c", 100, 440, 500, 140),
      box("g", 100, 460, 500, 100),
      box("h", 100, 480, 500, 60),
      box("i", 100, 490, 500, 30),
    ];
    expect(input.every((e) => elementSchema.safeParse(e).success)).toBe(true);
    const result = layoutDiagram(input);
    expect(result.every((e) => elementSchema.safeParse(e).success)).toBe(true);
    expect(
      result.some((e) => e.type === "arrow" && e.text === "contains"),
    ).toBe(true);
  });
  it("positions labels for horizontal, vertical, and reversed arrows inside the canvas", () => {
    for (const [width, height] of [
      [150, 0],
      [0, 100],
      [-100, 0],
      [0, -100],
    ]) {
      const arrow = {
        ...box("a", 300, 300, width, height, "Remembered environment"),
        type: "arrow" as const,
      };
      const label = labelBounds(arrow, [arrow]);
      expect(label.width).toBeGreaterThan(0);
      expect(label.height).toBeGreaterThan(0);
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width).toBeLessThanOrEqual(960);
      expect(label.y + label.height).toBeLessThanOrEqual(600);
    }
  });
});
