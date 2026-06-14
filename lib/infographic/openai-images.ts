import { getOpenAiKey } from "@/lib/skinlog/env";
import type { InfographicContent, InfographicQualityMode } from "./types";
import { flattenContent } from "./utils";

const DEFAULT_INFOGRAPHIC_IMAGE_MODEL = "gpt-image-2";

export function getInfographicImageModel(): string {
  return (
    process.env["OPENAI_INFOGRAPHIC_IMAGE_MODEL"]?.trim() ||
    DEFAULT_INFOGRAPHIC_IMAGE_MODEL
  );
}

export function qualityForMode(mode: InfographicQualityMode): "low" | "high" {
  return mode === "standard" ? "high" : "low";
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
  return match?.[1] ?? "image/jpeg";
}

function extensionForMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpeg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

function toJpegDataUrl(b64: string): string {
  return `data:image/jpeg;base64,${b64}`;
}

const STYLE_INTROS: Record<"A" | "B", string> = {
  A: `Create a complete patient education infographic poster. Style A — Clinical professional: deep navy blue and ice-blue palette, clean horizontal bands, subtle medical decorative motifs, polished hospital-grade aesthetic. Portrait 2:3 aspect ratio.`,

  B: `Create a complete patient education infographic poster. Style B — Modern friendly: teal, mint green, and soft white palette, organic rounded shapes, airy whitespace, warm approachable wellness aesthetic. Portrait 2:3 aspect ratio.`,
};

function buildInfographicPrompt(
  style: "A" | "B",
  content: InfographicContent,
  language: string,
): string {
  const textBlock = flattenContent(content, language);

  return `${STYLE_INTROS[style]}

Render ALL of the following text directly in the infographic image — title, facts, section headings, section bodies, warning, and footer. Text must be clearly legible, well-typeset, and integrated into the design layout. Use a professional infographic layout with header, key-facts row, 4 content sections, optional warning band, and footer.

${textBlock}

Rules:
- Every word above must appear in the image
- Plain-language patient education tone
- No watermarks or placeholder text
- Professional medical education quality`;
}

function generationBody(
  style: "A" | "B",
  content: InfographicContent,
  language: string,
  qualityMode: InfographicQualityMode,
  stream = false,
) {
  return {
    model: getInfographicImageModel(),
    prompt: buildInfographicPrompt(style, content, language),
    size: "1024x1536",
    quality: qualityForMode(qualityMode),
    output_format: "jpeg",
    output_compression: 85,
    ...(stream ? { stream: true, partial_images: 2 } : {}),
  };
}

export async function generateDesignImage(
  style: "A" | "B",
  content: InfographicContent,
  language: string,
  qualityMode: InfographicQualityMode = "fast",
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
    body: JSON.stringify(generationBody(style, content, language, qualityMode)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI design generation failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no design image data.");
  return toJpegDataUrl(b64);
}

/** Proxies OpenAI SSE stream for a single infographic variant. */
export async function streamDesignImage(
  style: "A" | "B",
  content: InfographicContent,
  language: string,
  qualityMode: InfographicQualityMode = "fast",
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
    body: JSON.stringify(
      generationBody(style, content, language, qualityMode, true),
    ),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI design stream failed (${response.status}): ${errorText}`,
    );
  }

  if (!response.body) {
    throw new Error("OpenAI returned no stream body.");
  }

  return response;
}

export async function generateBothDesignImages(
  content: InfographicContent,
  language: string,
  qualityMode: InfographicQualityMode = "fast",
): Promise<{ imageA: string; imageB: string }> {
  const [imageA, imageB] = await Promise.all([
    generateDesignImage("A", content, language, qualityMode),
    generateDesignImage("B", content, language, qualityMode),
  ]);
  return { imageA, imageB };
}

export async function editDesignImage(
  image: string,
  prompt: string,
  qualityMode: InfographicQualityMode = "fast",
): Promise<string> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Add OPENAI_API_KEY in Vercel Environment Variables.",
    );
  }

  const imageMime = mimeFromDataUrl(image);
  const form = new FormData();
  form.append("model", getInfographicImageModel());
  form.append("prompt", prompt);
  form.append("size", "1024x1536");
  form.append("quality", qualityForMode(qualityMode));
  form.append("output_format", "jpeg");
  form.append("output_compression", "85");
  form.append(
    "image",
    new Blob([dataUrlToArrayBuffer(image)], { type: imageMime }),
    `image.${extensionForMime(imageMime)}`,
  );

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI edit failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no edited image.");
  return toJpegDataUrl(b64);
}
