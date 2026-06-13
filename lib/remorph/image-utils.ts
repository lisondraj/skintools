import { REMORPH_STAGE_SIZE } from "@/lib/remorph/types";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

/** Fit image onto a square stage with neutral padding (contain). */
export async function normalizeToStage(
  source: string,
  size = REMORPH_STAGE_SIZE,
): Promise<string> {
  const img = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare canvas.");

  ctx.fillStyle = "#e8e4df";
  ctx.fillRect(0, 0, size, size);

  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  ctx.drawImage(img, x, y, w, h);

  return canvas.toDataURL("image/png");
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

/** OpenAI mask: transparent = edit, opaque = preserve. */
export function buildEditMaskFromBrush(
  brushCanvas: HTMLCanvasElement,
  size = REMORPH_STAGE_SIZE,
): { mask: string; hasPaint: boolean } {
  const brushCtx = brushCanvas.getContext("2d");
  if (!brushCtx) throw new Error("Could not read brush layer.");

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = size;
  maskCanvas.height = size;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) throw new Error("Could not build mask.");

  const brushData = brushCtx.getImageData(0, 0, size, size);
  const maskData = maskCtx.createImageData(size, size);

  let hasPaint = false;
  for (let i = 0; i < brushData.data.length; i += 4) {
    const painted = brushData.data[i + 3] > 8;
    if (painted) hasPaint = true;
    maskData.data[i] = 0;
    maskData.data[i + 1] = 0;
    maskData.data[i + 2] = 0;
    maskData.data[i + 3] = painted ? 0 : 255;
  }

  maskCtx.putImageData(maskData, 0, 0);
  return { mask: maskCanvas.toDataURL("image/png"), hasPaint };
}
