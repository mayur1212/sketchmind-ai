import { elementSchema, type DiagramElement } from "./lesson";
const shape = (e: DiagramElement) =>
  ["rectangle", "circle", "highlight", "fraction"].includes(e.type);
const contains = (a: DiagramElement, b: DiagramElement) =>
  a.x <= b.x &&
  a.y <= b.y &&
  a.x + a.width >= b.x + b.width &&
  a.y + a.height >= b.y + b.height &&
  a.width * a.height > b.width * b.height;
const overlaps = (a: DiagramElement, b: DiagramElement) =>
  a.x < b.x + b.width + 12 &&
  b.x < a.x + a.width + 12 &&
  a.y < b.y + b.height + 12 &&
  b.y < a.y + a.height + 12;
/** Preserve deliberate nesting, but repair intersecting sibling nodes locally. */
export function layoutDiagram(input: DiagramElement[]): DiagramElement[] {
  const elements = input.map((e) => ({ ...e }));
  const nodes = elements.filter((e) => shape(e) || e.type === "text");
  const parents = new Map<string, string>();
  for (const node of nodes) {
    const parent = nodes
      .filter((p) => shape(p) && p.type !== "fraction" && contains(p, node))
      .sort((a, b) => a.width * a.height - b.width * b.height)[0];
    if (parent) parents.set(node.id, parent.id);
  }
  function arrange(parent?: DiagramElement) {
    const children = nodes.filter((n) => parents.get(n.id) === parent?.id);
    const collision = children.some((a, i) =>
      children.slice(i + 1).some((b) => overlaps(a, b)),
    );
    const crowdedHeader =
      parent &&
      children.some(
        (e) =>
          e.y < parent.y + (parent.text ? 64 : 24) ||
          e.x < parent.x + 20 ||
          e.x + e.width > parent.x + parent.width - 20 ||
          e.y + e.height > parent.y + parent.height - 20,
      );
    if (collision || crowdedHeader) {
      const columns =
        children.length <= 3
          ? children.length
          : Math.ceil(Math.sqrt(children.length));
      const rows = Math.ceil(children.length / columns);
      const area = parent
        ? {
            x: parent.x + 24,
            y: parent.y + (parent.text ? 64 : 24),
            width: parent.width - 48,
            height: parent.height - (parent.text ? 88 : 48),
          }
        : { x: 36, y: 28, width: 888, height: 544 };
      const gap = 24;
      const width = (area.width - gap * (columns - 1)) / columns;
      const height = (area.height - gap * (rows - 1)) / rows;
      children.forEach((e, i) => {
        const old = { ...e };
        e.x = area.x + (i % columns) * (width + gap);
        e.y = area.y + Math.floor(i / columns) * (height + gap);
        e.width = Math.max(24, width);
        e.height = Math.max(24, height);
        // Move descendants with their container before arranging its children.
        for (const descendant of nodes) {
          if (descendant === e) continue;
          let id = parents.get(descendant.id);
          let inside = false;
          while (id) {
            if (id === e.id) {
              inside = true;
              break;
            }
            id = parents.get(id);
          }
          if (inside) {
            descendant.x = e.x + (descendant.x - old.x) * (e.width / old.width);
            descendant.y =
              e.y + (descendant.y - old.y) * (e.height / old.height);
            descendant.width *= e.width / old.width;
            descendant.height *= e.height / old.height;
          }
        }
      });
    }
    for (const child of children.filter(shape)) arrange(child);
  }
  arrange();
  // Keep connectors attached when collision repair moves their original nodes.
  for (const line of elements.filter(
    (e) => e.type === "line" || e.type === "arrow",
  )) {
    const remap = (x: number, y: number) => {
      const candidates = input
        .filter(shape)
        .map((e) => ({
          e,
          d: Math.hypot(
            Math.max(e.x - x, 0, x - e.x - e.width),
            Math.max(e.y - y, 0, y - e.y - e.height),
          ),
        }))
        .sort(
          (a, b) =>
            a.d - b.d || a.e.width * a.e.height - b.e.width * b.e.height,
        );
      const nearest = candidates[0];
      if (!nearest || nearest.d > 50) return { x, y };
      const moved = elements.find((e) => e.id === nearest.e.id)!;
      return {
        x: moved.x + ((x - nearest.e.x) * moved.width) / nearest.e.width,
        y: moved.y + ((y - nearest.e.y) * moved.height) / nearest.e.height,
      };
    };
    const start = remap(line.x, line.y);
    const end = remap(line.x + line.width, line.y + line.height);
    line.x = start.x;
    line.y = start.y;
    line.width = end.x - start.x;
    line.height = end.y - start.y;
  }
  // Repair is itself untrusted geometry: validate it again, rather than assuming
  // that valid model coordinates remain valid after nested containers move.
  if (
    elements.some((e) => !elementSchema.safeParse(e).success) ||
    nodes.some((e) => {
      const id = parents.get(e.id);
      if (!id) return false;
      const parent = elements.find((p) => p.id === id)!;
      return !contains(parent, e);
    })
  ) {
    return flatLayout(input, parents);
  }
  return elements;
}
function flatLayout(
  input: DiagramElement[],
  parents: Map<string, string>,
): DiagramElement[] {
  const nodes = input
    .filter((e) => shape(e) || e.type === "text")
    .map((e) => ({ ...e }));
  const columns = Math.min(4, Math.ceil(Math.sqrt(nodes.length)));
  const rows = Math.ceil(nodes.length / columns);
  const gap = 24,
    width = (888 - gap * (columns - 1)) / columns,
    height = (544 - gap * (rows - 1)) / rows;
  nodes.forEach((e, i) =>
    Object.assign(e, {
      x: 36 + (i % columns) * (width + gap),
      y: 28 + Math.floor(i / columns) * (height + gap),
      width,
      height,
    }),
  );
  const connectors: DiagramElement[] = [];
  const connect = (
    id: string,
    from: DiagramElement,
    to: DiagramElement,
    text: string,
  ) => {
    const a = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const b = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    const boundary = (node: DiagramElement, dx: number, dy: number) => {
      const factor = Math.min(
        dx ? node.width / 2 / Math.abs(dx) : Infinity,
        dy ? node.height / 2 / Math.abs(dy) : Infinity,
      );
      return {
        x: node.x + node.width / 2 + dx * factor,
        y: node.y + node.height / 2 + dy * factor,
      };
    };
    const start = boundary(from, b.x - a.x, b.y - a.y),
      end = boundary(to, a.x - b.x, a.y - b.y);
    if (start.x === end.x && start.y === end.y) return;
    connectors.push({
      id,
      type: "arrow",
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
      text,
      color: "#7625ad",
      fill: "#190f25",
      fontSize: 14,
    });
  };
  // A cramped hierarchy becomes a bounded relationship diagram; containment is
  // represented explicitly, so the fallback retains the teaching relationship.
  for (const [childId, parentId] of parents) {
    const from = nodes.find((e) => e.id === parentId),
      to = nodes.find((e) => e.id === childId);
    if (from && to)
      connect(`layout-link-${connectors.length}`, from, to, "contains");
  }
  for (const line of input.filter(
    (e) => e.type === "line" || e.type === "arrow",
  )) {
    const nearest = (x: number, y: number) =>
      input
        .filter((e) => shape(e) || e.type === "text")
        .sort(
          (a, b) =>
            Math.hypot(a.x + a.width / 2 - x, a.y + a.height / 2 - y) -
            Math.hypot(b.x + b.width / 2 - x, b.y + b.height / 2 - y),
        )[0];
    const fromId = nearest(line.x, line.y)?.id,
      toId = nearest(line.x + line.width, line.y + line.height)?.id;
    const from = nodes.find((e) => e.id === fromId),
      to = nodes.find((e) => e.id === toId);
    if (from && to && from !== to) connect(line.id, from, to, line.text);
  }
  return [...nodes, ...connectors].map((e) => elementSchema.parse(e));
}
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export function labelBounds(e: DiagramElement, elements: DiagramElement[]) {
  if (e.type === "line" || e.type === "arrow") {
    const width = Math.min(220, Math.max(120, e.text.length * 7)),
      height = 48;
    const x = e.x + e.width / 2,
      y = e.y + e.height / 2;
    const candidates = [
      { x: x - width / 2, y: y - height - 12 },
      { x: x - width / 2, y: y + 12 },
      { x: x + 12, y: y - height / 2 },
      { x: x - width - 12, y: y - height / 2 },
    ].map((p) => ({
      ...p,
      x: clamp(p.x, 8, 952 - width),
      y: clamp(p.y, 8, 592 - height),
      width,
      height,
    }));
    const score = (label: (typeof candidates)[number]) =>
      elements.filter(shape).reduce((total, node) => {
        if (
          node.x <= label.x &&
          node.y <= label.y &&
          node.x + node.width >= label.x + width &&
          node.y + node.height >= label.y + height &&
          elements.some(
            (child) => child !== node && shape(child) && contains(node, child),
          )
        )
          return total;
        return (
          total +
          Math.max(
            0,
            Math.min(label.x + width, node.x + node.width) -
              Math.max(label.x, node.x),
          ) *
            Math.max(
              0,
              Math.min(label.y + height, node.y + node.height) -
                Math.max(label.y, node.y),
            )
        );
      }, 0);
    const best = candidates.sort((a, b) => score(a) - score(b))[0];
    return {
      ...best,
      align: "center" as const,
      verticalAlign: "middle" as const,
    };
  }
  if (e.type === "fraction")
    return {
      x: e.x + 8,
      y: e.y + e.height - 42,
      width: e.width - 16,
      height: 36,
      align: "center" as const,
      verticalAlign: "middle" as const,
    };
  const container =
    shape(e) &&
    elements.some(
      (child) =>
        child.id !== e.id &&
        (shape(child) || child.type === "text") &&
        contains(e, child),
    );
  return {
    x: e.x + (e.type === "circle" ? e.width * 0.16 : 12),
    y: e.y + (e.type === "circle" ? e.height * 0.16 : 12),
    width: Math.max(1, e.type === "circle" ? e.width * 0.68 : e.width - 24),
    height: Math.max(
      1,
      container ? 40 : e.type === "circle" ? e.height * 0.68 : e.height - 24,
    ),
    align: e.type === "text" ? ("left" as const) : ("center" as const),
    verticalAlign: container ? ("top" as const) : ("middle" as const),
  };
}
