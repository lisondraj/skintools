import type { SlideElement, TextElement } from "@/lib/modules/types";
import { MODULES_STAGE_H, MODULES_STAGE_W } from "@/lib/modules/types";

export function createTextElement(
  text = "Double-click to edit",
  z = 1,
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
    color: "#111111",
    align: "left",
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
