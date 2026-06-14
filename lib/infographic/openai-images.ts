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
  A: `Create a VERTICAL PORTRAIT (2:3) patient education infographic poster for an Ontario, Canada dermatology clinic.

STYLE A — Two-column clinical editorial layout:
STRUCTURE (top to bottom):
1. Full-width HEADER BAND (deep navy #0a2540): Condition title in large bold white sans-serif, subtitle below in smaller ice-blue text. Ontario maple leaf icon small in top-right corner.
2. Below header — TWO COLUMNS side by side filling most of the poster:
   LEFT COLUMN (38% width, pale ice-blue #e8f4fd background): 
     - "At a Glance" label at top
     - 4 KEY STAT BOXES stacked vertically — each a small rounded rectangle with a bold large number/statistic and a 2-line label below it, alternating white and light teal backgrounds
     - Small "Ontario Health" wordmark style text at the bottom of the column
   RIGHT COLUMN (62% width, white background):
     - 5-6 content sections stacked, each with: a small coloured category pill tag (INFO/TIP/WARNING/NOTE), bold section heading in dark navy, and 3-4 sentences of body text in dark grey
     - Thin horizontal rule between each section
     - Warning band (amber #f59e0b background) if a warning is present
3. Full-width FOOTER BAND (dark navy): disclaimer text in white, Telehealth Ontario reference in small ice-blue text

COLOUR PALETTE: Deep navy #0a2540, teal #0e7490, ice-blue #e8f4fd, amber accent #e8a820, white, dark grey text #1a202c
TYPOGRAPHY: Clean geometric sans-serif, strong hierarchy, clinical precision`,

  B: `Create a VERTICAL PORTRAIT (2:3) patient education infographic poster for an Ontario, Canada dermatology clinic.

STYLE B — Single-column visual step-by-step journey layout:
STRUCTURE (top to bottom):
1. HEADER (warm coral-red #c0392b): Very large bold rounded sans-serif condition title in white, tagline below in light pink. Full width.
2. QUICK FACTS ROW: 4 horizontal pill-shaped badges on cream background, each with an icon and short bold fact text. Teal (#0d9488) on warm cream (#faf5eb) background.
3. CONTENT SECTIONS (6 sections) — each section is a distinct visual block:
   - Large coloured circle on the LEFT with a section number (1-6) in white bold text
   - Section heading in large bold dark text to the right of the circle
   - Body text in slightly smaller regular weight dark grey below the heading
   - Each section has a subtle left-side vertical colour bar matching its type (teal=info, coral=warning, gold=tip, sage=note)
   - Alternating very-slightly-tinted row backgrounds (pure white and warm cream #faf5eb) for visual rhythm
4. ONTARIO RESOURCES CALL-OUT BOX: Highlighted teal rounded rectangle panel, bold "Get Help in Ontario" heading, Telehealth Ontario number (1-800-797-0000) prominent, ontario.ca/health below.
5. FOOTER: Warm cream background, small disclaimer text, Ontario Health reference.

COLOUR PALETTE: Coral-red #c0392b, teal #0d9488, warm cream #faf5eb, gold #f59e0b, soft sage #6b9e7a, white, dark charcoal text #1a1a2e
TYPOGRAPHY: Friendly rounded humanist sans-serif, generous line-height, large readable body text`,
};

function buildInfographicPrompt(
  style: "A" | "B",
  content: InfographicContent,
  language: string,
): string {
  const textBlock = flattenContent(content, language);

  return `${STYLE_INTROS[style]}

CONTENT TO RENDER — embed ALL of the following text directly and legibly into the infographic image. Every word must appear in the image, well-typeset and integrated into the layout described above:

${textBlock}

CRITICAL RULES:
- Follow the structural layout described above precisely — Style A must be two-column, Style B must be single-column step-by-step
- Every line of text above must appear somewhere in the image — title, subtitle, all 4 key facts, all section headings and bodies, warning (if present), footer
- Text must be clearly legible at normal reading size — no blurry, clipped, or overlapping text
- Ontario Canada healthcare context — professional medical education quality
- No watermarks, stock photo placeholders, or lorem ipsum text
- Portrait 2:3 aspect ratio, full-bleed design from edge to edge`;
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
