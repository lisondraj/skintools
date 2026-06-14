import { getOpenAiKey } from "@/lib/skinlog/env";
import type { RemorphQualityMode } from "@/lib/remorph/types";

const DEFAULT_IMAGE_MODEL = "gpt-image-2";

export function getImageModel(): string {
  return process.env["OPENAI_IMAGE_MODEL"]?.trim() || DEFAULT_IMAGE_MODEL;
}

export function qualityForMode(mode: RemorphQualityMode): "low" | "high" {
  return mode === "quality" ? "high" : "low";
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL.");
  const buf = Buffer.from(match[2], "base64");
  const copy = new Uint8Array(buf.length);
  copy.set(buf);
  return copy.buffer;
}

function mimeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match?.[1] ?? "image/png";
}

function extensionForMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpeg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

function buildLesionPrompt(userPrompt: string): string {
  return `Clinical dermatology close-up photograph, macro detail of skin. ${userPrompt}. Photorealistic, neutral clinical lighting, sharp focus on skin surface texture. No text, no labels, no watermarks.`;
}

function generationBody(
  userPrompt: string,
  qualityMode: RemorphQualityMode,
  stream = false,
) {
  return {
    model: getImageModel(),
    prompt: buildLesionPrompt(userPrompt),
    size: "1024x1024",
    quality: qualityForMode(qualityMode),
    output_format: "jpeg",
    output_compression: 85,
    ...(stream ? { stream: true, partial_images: 2 } : {}),
  };
}

function toJpegDataUrl(b64: string): string {
  return `data:image/jpeg;base64,${b64}`;
}

export async function generateLesionImage(
  userPrompt: string,
  qualityMode: RemorphQualityMode = "fast",
): Promise<string> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Add OPENAI_API_KEY in Vercel Environment Variables.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(generationBody(userPrompt, qualityMode)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI generation failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data.");
  return toJpegDataUrl(b64);
}

/** Proxies OpenAI SSE stream for partial + final image events. */
export async function streamLesionImage(
  userPrompt: string,
  qualityMode: RemorphQualityMode = "fast",
): Promise<Response> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Add OPENAI_API_KEY in Vercel Environment Variables.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(generationBody(userPrompt, qualityMode, true)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI generation failed (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error("OpenAI returned no stream body.");
  }

  return response;
}

export async function editLesionImage(
  image: string,
  prompt: string,
  mask?: string,
  qualityMode: RemorphQualityMode = "fast",
): Promise<string> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Add OPENAI_API_KEY in Vercel Environment Variables.",
    );
  }

  const imageMime = mimeFromDataUrl(image);
  const form = new FormData();
  form.append("model", getImageModel());
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("quality", qualityForMode(qualityMode));
  form.append("output_format", "jpeg");
  form.append("output_compression", "85");
  form.append(
    "image",
    new Blob([dataUrlToArrayBuffer(image)], { type: imageMime }),
    `image.${extensionForMime(imageMime)}`,
  );

  if (mask) {
    form.append(
      "mask",
      new Blob([dataUrlToArrayBuffer(mask)], { type: "image/png" }),
      "mask.png",
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI edit failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no edited image.");
  return toJpegDataUrl(b64);
}
