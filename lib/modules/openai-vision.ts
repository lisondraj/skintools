import type { SlideContextImage } from "./types";

type VisionPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } };

export type VisionUserContent = string | VisionPart[];

export function buildVisionUserContent(
  text: string,
  images?: SlideContextImage[],
): VisionUserContent {
  if (!images?.length) return text;

  const parts: VisionPart[] = [{ type: "text", text }];

  for (const image of images) {
    parts.push({ type: "text", text: `Visual context — ${image.label}:` });
    parts.push({
      type: "image_url",
      image_url: { url: image.url, detail: "low" },
    });
  }

  return parts;
}
