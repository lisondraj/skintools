import type { RemorphRegion } from "@/lib/remorph/types";
import { REMORPH_STAGE_SIZE } from "@/lib/remorph/types";

function polygonArea(polygon: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

export function pointInPolygon(
  x: number,
  y: number,
  polygon: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function rasterizePolygon(
  polygon: [number, number][],
  size = REMORPH_STAGE_SIZE,
): Uint8Array {
  const mask = new Uint8Array(size * size);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not rasterize polygon.");

  ctx.beginPath();
  polygon.forEach(([px, py], index) => {
    const x = px * size;
    const y = py * size;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const data = ctx.getImageData(0, 0, size, size).data;
  for (let i = 0; i < size * size; i++) {
    if (data[i * 4 + 3] > 0) mask[i] = 1;
  }

  return mask;
}

export function buildCategoryMasks(
  regions: RemorphRegion[],
  size = REMORPH_STAGE_SIZE,
): Map<string, Uint8Array> {
  const categoryMasks = new Map<string, Uint8Array>();

  for (const region of regions) {
    const regionMask = rasterizePolygon(region.polygon, size);
    const existing = categoryMasks.get(region.category);
    if (!existing) {
      categoryMasks.set(region.category, regionMask);
      continue;
    }
    for (let i = 0; i < existing.length; i++) {
      if (regionMask[i]) existing[i] = 1;
    }
  }

  return categoryMasks;
}

export function hitTestRegion(
  regions: RemorphRegion[],
  x: number,
  y: number,
): RemorphRegion | null {
  let best: RemorphRegion | null = null;
  let bestArea = Infinity;

  for (const region of regions) {
    if (!pointInPolygon(x, y, region.polygon)) continue;
    const area = polygonArea(region.polygon);
    if (area < bestArea) {
      best = region;
      bestArea = area;
    }
  }

  return best;
}

export function getCategoryLabel(
  regions: RemorphRegion[],
  category: string,
): string {
  const match = regions.find((region) => region.category === category);
  return match?.label ?? category.replace(/_/g, " ");
}
