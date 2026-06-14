import { loadImage } from "@/lib/remorph/image-utils";
import type { RemorphFeature } from "@/lib/remorph/types";
import {
  REMORPH_SEG_RES,
  REMORPH_SKIN_CATEGORY,
} from "@/lib/remorph/types";

export type HitResult = {
  category: string;
  label: string;
};

export type FeatureMaskBundle = {
  featureMasks: Map<string, Uint8Array>;
  categoryMasks: Map<string, Uint8Array>;
};

export async function getImagePixels(
  image: string,
  size = REMORPH_SEG_RES,
): Promise<ImageData> {
  const img = await loadImage(image);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read image pixels.");
  ctx.drawImage(img, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

function countFilled(mask: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) count++;
  }
  return count;
}

function avgPatchColor(
  data: Uint8ClampedArray,
  cx: number,
  cy: number,
  size: number,
): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const i = (y * size + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  return [r / count, g / count, b / count];
}

function colorDistSqToRgb(
  data: Uint8ClampedArray,
  pixelIndex: number,
  target: [number, number, number],
): number {
  const i = pixelIndex * 4;
  const dr = data[i] - target[0];
  const dg = data[i + 1] - target[1];
  const db = data[i + 2] - target[2];
  return dr * dr + dg * dg + db * db;
}

function dilate(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  if (radius <= 0) return new Uint8Array(mask);
  const out = new Uint8Array(mask);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask[i]) continue;
      outer: for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < width &&
            ny >= 0 &&
            ny < height &&
            mask[ny * width + nx]
          ) {
            out[i] = 1;
            break outer;
          }
        }
      }
    }
  }
  return out;
}

function erode(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  if (radius <= 0) return new Uint8Array(mask);
  const out = new Uint8Array(mask);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            out[i] = 0;
            break;
          }
          if (!mask[ny * width + nx]) {
            out[i] = 0;
            break;
          }
        }
        if (!out[i]) break;
      }
    }
  }
  return out;
}

function morphClose(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  return erode(dilate(mask, width, height, radius), width, height, radius);
}

function fillEllipseInBbox(
  bbox: [number, number, number, number],
  size: number,
): Uint8Array {
  const mask = new Uint8Array(size * size);
  const bx = bbox[0] * size;
  const by = bbox[1] * size;
  const bw = bbox[2] * size;
  const bh = bbox[3] * size;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const rx = Math.max(2, bw / 2);
  const ry = Math.max(2, bh / 2);

  const x0 = Math.max(0, Math.floor(bx));
  const y0 = Math.max(0, Math.floor(by));
  const x1 = Math.min(size, Math.ceil(bx + bw));
  const y1 = Math.min(size, Math.ceil(by + bh));

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        mask[y * size + x] = 1;
      }
    }
  }

  return mask;
}

function floodFillOnce(
  pixels: ImageData,
  seedX: number,
  seedY: number,
  bbox: [number, number, number, number],
  size: number,
  thresholdSq: number,
): Uint8Array {
  const { data } = pixels;
  const mask = new Uint8Array(size * size);
  const visited = new Uint8Array(size * size);

  const pad = 0.05;
  const minX = Math.max(0, Math.floor((bbox[0] - pad) * size));
  const minY = Math.max(0, Math.floor((bbox[1] - pad) * size));
  const maxX = Math.min(size - 1, Math.ceil((bbox[0] + bbox[2] + pad) * size));
  const maxY = Math.min(size - 1, Math.ceil((bbox[1] + bbox[3] + pad) * size));

  const sx = Math.min(maxX, Math.max(minX, seedX));
  const sy = Math.min(maxY, Math.max(minY, seedY));
  const target = avgPatchColor(data, sx, sy, size);

  const stack: number[] = [sy * size + sx];
  visited[sy * size + sx] = 1;

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const x = idx % size;
    const y = Math.floor(idx / size);

    if (colorDistSqToRgb(data, idx, target) > thresholdSq) continue;
    mask[idx] = 1;

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
      const ni = ny * size + nx;
      if (visited[ni]) continue;
      visited[ni] = 1;
      stack.push(ni);
    }
  }

  return mask;
}

export function floodFillFeature(
  pixels: ImageData,
  seed: [number, number],
  bbox: [number, number, number, number],
  size = REMORPH_SEG_RES,
): Uint8Array {
  const seedX = Math.floor(seed[0] * size);
  const seedY = Math.floor(seed[1] * size);
  const bboxArea = Math.max(1, bbox[2] * bbox[3] * size * size);

  const thresholds = [38 * 38, 55 * 55];
  let mask = floodFillOnce(pixels, seedX, seedY, bbox, size, thresholds[0]);
  let filled = countFilled(mask);

  if (filled < bboxArea * 0.02) {
    mask = floodFillOnce(pixels, seedX, seedY, bbox, size, thresholds[1]);
    filled = countFilled(mask);
  }

  if (filled > bboxArea * 0.9) {
    mask = fillEllipseInBbox(bbox, size);
  } else if (filled < bboxArea * 0.005) {
    mask = fillEllipseInBbox(bbox, size);
  } else {
    mask = morphClose(mask, size, size, 2);
    mask = dilate(mask, size, size, 1);
  }

  return mask;
}

export function buildFeatureMasks(
  features: RemorphFeature[],
  pixels: ImageData,
  size = REMORPH_SEG_RES,
): FeatureMaskBundle {
  const featureMasks = new Map<string, Uint8Array>();
  const categoryMasks = new Map<string, Uint8Array>();

  for (const feature of features) {
    const mask = floodFillFeature(pixels, feature.seed, feature.bbox, size);
    featureMasks.set(feature.id, mask);

    let categoryMask = categoryMasks.get(feature.category);
    if (!categoryMask) {
      categoryMask = new Uint8Array(size * size);
      categoryMasks.set(feature.category, categoryMask);
    }
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) categoryMask[i] = 1;
    }
  }

  return { featureMasks, categoryMasks };
}

export function computeSkinMask(
  categoryMasks: Map<string, Uint8Array>,
  size = REMORPH_SEG_RES,
): Uint8Array {
  const total = size * size;
  const union = new Uint8Array(total);

  for (const [category, mask] of categoryMasks) {
    if (category === REMORPH_SKIN_CATEGORY) continue;
    for (let i = 0; i < total; i++) {
      if (mask[i]) union[i] = 1;
    }
  }

  const skin = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (!union[i]) skin[i] = 1;
  }

  return erode(skin, size, size, 2);
}

export function finalizeCategoryMasks(
  features: RemorphFeature[],
  pixels: ImageData,
  size = REMORPH_SEG_RES,
): Map<string, Uint8Array> {
  const { categoryMasks } = buildFeatureMasks(features, pixels, size);
  const skinMask = computeSkinMask(categoryMasks, size);
  categoryMasks.set(REMORPH_SKIN_CATEGORY, skinMask);
  return categoryMasks;
}

export function hitTestFeatureAt(
  featureMasks: Map<string, Uint8Array>,
  features: RemorphFeature[],
  categoryMasks: Map<string, Uint8Array>,
  nx: number,
  ny: number,
  size = REMORPH_SEG_RES,
): HitResult {
  const px = Math.min(size - 1, Math.max(0, Math.floor(nx * size)));
  const py = Math.min(size - 1, Math.max(0, Math.floor(ny * size)));
  const idx = py * size + px;

  let best: RemorphFeature | null = null;
  let bestArea = Infinity;

  for (const feature of features) {
    const mask = featureMasks.get(feature.id);
    if (!mask?.[idx]) continue;
    const area = countFilled(mask);
    if (area < bestArea) {
      best = feature;
      bestArea = area;
    }
  }

  if (best) {
    return { category: best.category, label: best.label };
  }

  const skinMask = categoryMasks.get(REMORPH_SKIN_CATEGORY);
  if (skinMask?.[idx]) {
    return { category: REMORPH_SKIN_CATEGORY, label: "Background skin" };
  }

  return { category: REMORPH_SKIN_CATEGORY, label: "Background skin" };
}
