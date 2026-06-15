import { DEFAULT_SHAPE } from "./shapes";
import type { ShapeKind, ShapeElement, SlideElement, TextElement } from "./types";
import { MODULES_STAGE_H, MODULES_STAGE_W } from "@/lib/modules/types";
import { DEFAULT_FONT_STYLE } from "@/lib/modules/fonts";

export function createTextElement(
  text = "Double-click to edit",
  z = 1,
  overrides?: Partial<Omit<TextElement, "kind" | "id" | "text" | "z">>,
): TextElement {
  return {
    kind: "text",
    id: crypto.randomUUID(),
    x: 80,
    y: 80,
    w: 400,
    h: 120,
    z,
    text,
    fontSize: 28,
    fontWeight: 500,
    fontStyle: DEFAULT_FONT_STYLE,
    color: "#111111",
    align: "left",
    ...overrides,
  };
}

export function createImageElement(src: string, z = 1) {
  return {
    kind: "image" as const,
    id: crypto.randomUUID(),
    x: 120,
    y: 120,
    w: 320,
    h: 240,
    z,
    src,
  };
}

export function createShapeElement(
  shape: ShapeKind = DEFAULT_SHAPE,
  z = 1,
  overrides?: Partial<Omit<ShapeElement, "kind" | "id" | "shape" | "z">>,
): ShapeElement {
  return {
    kind: "shape",
    id: crypto.randomUUID(),
    x: 120,
    y: 120,
    w: 200,
    h: 120,
    z,
    shape,
    fill: "#eef2ff",
    stroke: "#6366f1",
    strokeWidth: 2,
    opacity: 1,
    ...overrides,
  };
}

export function slideElementsFromLayout(
  layout: { title: string; body: string },
  notes?: string,
): { elements: SlideElement[]; notes?: string } {
  const title = createTextElement(layout.title, 1, {
    x: 80,
    y: 60,
    w: MODULES_STAGE_W - 160,
    h: 72,
    fontSize: 36,
    fontWeight: 600,
  });
  const body = createTextElement(layout.body, 2, {
    x: 80,
    y: 160,
    w: MODULES_STAGE_W - 160,
    h: 280,
    fontSize: 22,
    fontWeight: 400,
  });
  return { elements: [title, body], notes };
}

export function clampElement(el: SlideElement): SlideElement {
  const minSize = 40;
  const w = Math.max(minSize, Math.min(el.w, MODULES_STAGE_W));
  const h = Math.max(minSize, Math.min(el.h, MODULES_STAGE_H));
  const x = Math.max(0, Math.min(el.x, MODULES_STAGE_W - w));
  const y = Math.max(0, Math.min(el.y, MODULES_STAGE_H - h));
  return { ...el, x, y, w, h };
}

export function sortByZ(elements: SlideElement[]): SlideElement[] {
  return [...elements].sort((a, b) => a.z - b.z);
}

export function duplicateElement(el: SlideElement, z: number): SlideElement {
  return {
    ...el,
    id: crypto.randomUUID(),
    x: Math.min(el.x + 24, MODULES_STAGE_W - el.w),
    y: Math.min(el.y + 24, MODULES_STAGE_H - el.h),
    z,
  };
}

export function shiftElementZ(
  elements: SlideElement[],
  id: string,
  direction: "forward" | "backward",
): SlideElement[] {
  const sorted = sortByZ(elements);
  const idx = sorted.findIndex((el) => el.id === id);
  if (idx === -1) return elements;

  const swapIdx = direction === "forward" ? idx + 1 : idx - 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return elements;

  const current = sorted[idx];
  const neighbor = sorted[swapIdx];
  return elements.map((el) => {
    if (el.id === current.id) return { ...el, z: neighbor.z };
    if (el.id === neighbor.id) return { ...el, z: current.z };
    return el;
  });
}
