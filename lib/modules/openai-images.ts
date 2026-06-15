import { getOpenAiKey } from "@/lib/skinlog/env";
import type { SlideImagePurpose } from "./types";

const DEFAULT_IMAGE_MODEL = "gpt-image-2";

function getImageModel(): string {
  return process.env["OPENAI_IMAGE_MODEL"]?.trim() || DEFAULT_IMAGE_MODEL;
}

function qualityForMode(mode: "fast" | "quality"): "low" | "high" {
  return mode === "quality" ? "high" : "low";
}

function buildPrompt(userPrompt: string, purpose: SlideImagePurpose): string {
  const base = userPrompt.trim();
  switch (purpose) {
    case "background":
      return `Modern presentation slide background, 16:9 landscape, clean dermatology theme. ${base}. Contemporary, refined visual design. No text, no labels, no watermarks. Suitable as a backdrop with dark text overlay.`;
    case "infographic":
      return `Clinical dermatology infographic illustration for patient education. ${base}. Clean flat design, professional medical style. Minimal text only if essential. No watermarks.`;
    default:
      return `Professional dermatology presentation slide illustration. ${base}. Clean, educational, high quality. No watermarks unless text is requested.`;
  }
}

function sizeForPurpose(purpose: SlideImagePurpose): string {
  return purpose === "background" ? "1536x1024" : "1024x1024";
}

function toJpegDataUrl(b64: string): string {
  return `data:image/jpeg;base64,${b64}`;
}

export async function generateSlideImage(
  userPrompt: string,
  purpose: SlideImagePurpose = "image",
  qualityMode: "fast" | "quality" = "fast",
): Promise<string> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error("OpenAI API key not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getImageModel(),
      prompt: buildPrompt(userPrompt, purpose),
      size: sizeForPurpose(purpose),
      quality: qualityForMode(qualityMode),
      output_format: "jpeg",
      output_compression: 85,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image generation failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI.");
  return toJpegDataUrl(b64);
}
