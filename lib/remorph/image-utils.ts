import { REMORPH_STAGE_SIZE } from "@/lib/remorph/types";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

function dilateSelection(
  selection: Uint8Array,
  width: number,
  height: number,
  radius = 1,
): Uint8Array {
  const out = new Uint8Array(selection);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (selection[i]) continue;
      outer: for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < width &&
            ny >= 0 &&
            ny < height &&
            selection[ny * width + nx]
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

/** OpenAI mask: transparent = edit, opaque = preserve. */
export function buildMaskFromSelection(
  selection: Uint8Array,
  selWidth: number,
  selHeight: number,
  outputSize = REMORPH_STAGE_SIZE,
): { mask: string; hasSelection: boolean } {
  let hasSelection = false;
  for (let i = 0; i < selection.length; i++) {
    if (selection[i]) {
      hasSelection = true;
      break;
    }
  }

  const dilated = dilateSelection(selection, selWidth, selHeight, 1);
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = outputSize;
  maskCanvas.height = outputSize;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) throw new Error("Could not build mask.");

  const maskData = maskCtx.createImageData(outputSize, outputSize);
  const scaleX = selWidth / outputSize;
  const scaleY = selHeight / outputSize;

  for (let y = 0; y < outputSize; y++) {
    for (let x = 0; x < outputSize; x++) {
      const sx = Math.min(selWidth - 1, Math.floor(x * scaleX));
      const sy = Math.min(selHeight - 1, Math.floor(y * scaleY));
      const selected = dilated[sy * selWidth + sx] === 1;
      const oi = (y * outputSize + x) * 4;
      maskData.data[oi] = 0;
      maskData.data[oi + 1] = 0;
      maskData.data[oi + 2] = 0;
      maskData.data[oi + 3] = selected ? 0 : 255;
    }
  }

  maskCtx.putImageData(maskData, 0, 0);
  return { mask: maskCanvas.toDataURL("image/png"), hasSelection };
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
