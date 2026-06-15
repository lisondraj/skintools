import type { ImageElement } from "./types";
import { MODULES_STAGE_H, MODULES_STAGE_W } from "./types";

/** Resize an image element so its box matches the image aspect ratio (tight bounds). */
export function fitImageElementToNaturalSize(
  el: ImageElement,
  naturalWidth: number,
  naturalHeight: number,
): ImageElement {
  if (naturalWidth <= 0 || naturalHeight <= 0) return el;

  const aspect = naturalWidth / naturalHeight;
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;

  let w = el.w;
  let h = el.h;

  if (w / h > aspect) {
    w = h * aspect;
  } else {
    h = w / aspect;
  }

  w = Math.max(40, Math.round(w));
  h = Math.max(40, Math.round(h));

  const x = Math.max(0, Math.min(Math.round(cx - w / 2), MODULES_STAGE_W - w));
  const y = Math.max(0, Math.min(Math.round(cy - h / 2), MODULES_STAGE_H - h));

  return { ...el, x, y, w, h };
}
