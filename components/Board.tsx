"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Ellipse,
  Text,
  Arrow,
  Line,
  Group,
  Wedge,
} from "react-konva";
import { DiagramElement } from "@/lib/lesson";
import { layoutDiagram, labelBounds } from "@/lib/diagramLayout";
export type Stroke = { points: number[]; color: string; width: number };
export default function Board({
  elements,
  zoom,
  tool,
  color,
  width,
  strokes,
  onStrokes,
  onExport,
}: {
  elements: DiagramElement[];
  zoom: number;
  tool: string;
  color: string;
  width: number;
  strokes: Stroke[];
  onStrokes: (s: Stroke[]) => void;
  onExport: (fn: () => void) => void;
}) {
  const diagram = useMemo(() => layoutDiagram(elements), [elements]);
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<import("konva").default.Stage>(null);
  const drawing = useRef(false);
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 960, height: 600 });
  useEffect(() => {
    let active = true;
    // Canvas text must use the actual generated next/font family after it loads.
    document.fonts.ready.then(() => {
      if (active && wrap.current)
        setFontFamily(getComputedStyle(wrap.current).fontFamily);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const node = wrap.current;
    if (!node) return;
    const observer = new ResizeObserver(([e]) =>
      setSize({ width: e.contentRect.width, height: e.contentRect.height }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    onExport(() => {
      const a = document.createElement("a");
      a.download = "sketchmind-ai-whiteboard.png";
      a.href = stage.current!.toDataURL({ pixelRatio: 2 });
      a.click();
    });
  }, [onExport]);
  useEffect(() => {
    stage.current
      ?.find("Shape")
      .forEach((node) =>
        node.preventDefault(tool === "pen" || tool === "hand"),
      );
  }, [tool, diagram]);
  const mobile = size.width < 650 && elements.length > 0;
  // Small screens keep a readable diagram scale and scroll the canvas instead
  // of shrinking every label to 6–8 CSS pixels.
  const scale =
    (mobile ? 0.9 : Math.min(size.width / 960, size.height / 600)) * zoom;
  const stageWidth = Math.max(size.width, 960 * scale),
    stageHeight = Math.max(size.height, 600 * scale);
  const offsetX = Math.max(0, (stageWidth - 960 * scale) / 2),
    offsetY = Math.max(0, (stageHeight - 600 * scale) / 2);
  function point() {
    const p = stage.current?.getPointerPosition();
    if (!p || !stage.current) return null;
    const local = stage.current.getAbsoluteTransform().copy().invert().point(p);
    return [local.x, local.y];
  }
  return (
    <div
      className={`canvas-wrap tool-${tool} ${mobile ? "readable-canvas" : ""}`}
      ref={wrap}
      role="region"
      aria-label="Interactive whiteboard"
      tabIndex={0}
    >
      <Stage
        key={elements[0]?.id}

        ref={stage}
        draggable={tool === "hand"}
        width={stageWidth}
        height={stageHeight}
        scaleX={scale}
        scaleY={scale}
        x={offsetX}
        y={offsetY}
        onMouseDown={() => {
          if (tool !== "pen") return;
          const p = point();
          if (p) {
            drawing.current = true;
            onStrokes([...strokes, { points: p, color, width }]);
          }
        }}
        onTouchStart={() => {
          if (tool !== "pen") return;
          const p = point();
          if (p) {
            drawing.current = true;
            onStrokes([...strokes, { points: p, color, width }]);
          }
        }}
        onMouseMove={() => {
          if (!drawing.current) return;
          const p = point();
          if (p && strokes.length)
            onStrokes([
              ...strokes.slice(0, -1),
              {
                ...strokes[strokes.length - 1],
                points: [...strokes[strokes.length - 1].points, ...p],
              },
            ]);
        }}
        onTouchMove={(e) => {
          if (!drawing.current) return;
          e.evt.preventDefault();
          const p = point();
          if (p && strokes.length)
            onStrokes([
              ...strokes.slice(0, -1),
              {
                ...strokes[strokes.length - 1],
                points: [...strokes[strokes.length - 1].points, ...p],
              },
            ]);
        }}
        onMouseUp={() => (drawing.current = false)}
        onTouchEnd={() => (drawing.current = false)}
      >
        <Layer>
          <Rect width={960} height={600} fill="#13131f" />
          {[...diagram]
            .sort(
              (a, b) =>
                Math.abs(b.width * b.height) - Math.abs(a.width * a.height),
            )
            .map((e) => (
              <Group key={e.id}>
                {["rectangle", "highlight"].includes(e.type) && (
                  <Rect
                    x={e.x}
                    y={e.y}
                    width={e.width}
                    height={e.height}
                    fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                    fillLinearGradientEndPoint={{ x: e.width, y: e.height }}
                    fillLinearGradientColorStops={[0, "#481668", 1, "#190f25"]}
                    stroke="#7625ad"
                    strokeWidth={e.type === "highlight" ? 3 : 1.5}
                    cornerRadius={14}
                    opacity={e.type === "highlight" ? 0.6 : 1}
                  />
                )}
                {e.type === "fraction" && (
                  <Group>
                    {Array.from({ length: e.denominator! }, (_, i) => {
                      const radius = Math.min(e.width, e.height - 48) / 2;
                      return (
                        <Wedge
                          key={i}
                          x={e.x + e.width / 2}
                          y={e.y + radius + 4}
                          radius={radius}
                          angle={360 / e.denominator!}
                          rotation={(i * 360) / e.denominator! - 90}
                          fill={i < e.numerator! ? "#ee3c9e" : "#190f25"}
                          stroke="#b965ed"
                          strokeWidth={1.5}
                        />
                      );
                    })}
                  </Group>
                )}
                {e.type === "circle" && (
                  <Ellipse
                    x={e.x + e.width / 2}
                    y={e.y + e.height / 2}
                    radiusX={e.width / 2}
                    radiusY={e.height / 2}
                    fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                    fillLinearGradientEndPoint={{ x: e.width, y: e.height }}
                    fillLinearGradientColorStops={[0, "#481668", 1, "#190f25"]}
                    stroke="#7625ad"
                    strokeWidth={2}
                  />
                )}
                {(e.type === "arrow" || e.type === "line") &&
                  (e.type === "arrow" ? (
                    <Arrow
                      points={[e.x, e.y, e.x + e.width, e.y + e.height]}
                      stroke="#7625ad"
                      fill="#f65bae"
                      strokeWidth={2}
                      pointerLength={10}
                    />
                  ) : (
                    <Line
                      points={[e.x, e.y, e.x + e.width, e.y + e.height]}
                      stroke="#7625ad"
                      strokeWidth={2}
                    />
                  ))}
              </Group>
            ))}
          {diagram
            .filter((e) => e.text)
            .map((e) => (
              <BoardLabel
                key={`label-${e.id}`}
                element={e}
                elements={diagram}
                fontFamily={fontFamily}
                scale={scale}
                onRead={setSelectedLabel}
              />
            ))}
          {strokes.map((s, i) => (
            <Line
              key={i}
              points={s.points}
              stroke={s.color}
              strokeWidth={s.width}
              tension={0.4}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
      </Stage>
      {selectedLabel && (
        <div className="diagram-label-reader" role="status">
          <p>{selectedLabel}</p>
          <button
            type="button"
            aria-label="Close diagram label"
            onClick={() => setSelectedLabel(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function BoardLabel({
  element: e,
  elements,
  fontFamily,
  scale,
  onRead,
}: {
  scale: number;
  onRead: (text: string) => void;
  element: DiagramElement;
  elements: DiagramElement[];
  fontFamily: string;
}) {
  const bounds = labelBounds(e, elements);
  const fontSize = useMemo(() => {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return e.fontSize;
    const minimum = Math.ceil(14 / Math.max(scale, 0.25));
    for (
      let size = Math.max(minimum, Math.min(26, e.fontSize));
      size >= minimum;
      size--
    ) {
      ctx.font = `${size}px ${fontFamily}`;
      let lines = 0;
      for (const paragraph of e.text.split("\n")) {
        let row = "";
        lines++;
        for (const word of paragraph.split(/\s+/)) {
          const next = row ? row + " " + word : word;
          if (ctx.measureText(next).width > bounds.width && row) {
            lines++;
            row = word;
          } else row = next;
        }
      }
      if (lines * size * 1.35 <= bounds.height) return size;
    }
    return Math.ceil(14 / Math.max(scale, 0.25));
  }, [e.text, e.fontSize, fontFamily, bounds.width, bounds.height, scale]);
  return (
    <Group onClick={() => onRead(e.text)} onTap={() => onRead(e.text)}>
      {(e.type === "line" || e.type === "arrow") && (
        <Rect {...bounds} fill="#13131f" stroke="#7625ad" cornerRadius={6} />
      )}
      <Text
        {...bounds}
        text={e.text}
        fontSize={fontSize}
        fill={e.type === "text" && e.fontSize >= 24 ? "#f65bae" : "#ffffff"}
        fontFamily={fontFamily}
        lineHeight={1.35}
        wrap="word"
        ellipsis
      />
    </Group>
  );
}
