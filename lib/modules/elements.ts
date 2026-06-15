import type { SlideElement, TextElement } from "@/lib/modules/types";
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
