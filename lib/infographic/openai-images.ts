import { getOpenAiKey } from "@/lib/skinlog/env";

/** Infographic designs always use GPT Image 2 by default. */
const DEFAULT_INFOGRAPHIC_IMAGE_MODEL = "gpt-image-2";

export function getInfographicImageModel(): string {
  return (
    process.env["OPENAI_INFOGRAPHIC_IMAGE_MODEL"]?.trim() ||
    DEFAULT_INFOGRAPHIC_IMAGE_MODEL
  );
}

const SHARED_LAYOUT = `
Portrait patient education poster, 2:3 aspect ratio. Layout MUST follow these exact horizontal zones top to bottom:
1) Top header band (~15% height): decorative header area with light/white empty space for a title overlay.
2) Key-facts strip (~6% height): three small empty pill/chip placeholders in a row.
3) Four evenly spaced content panels (~55% total): each panel is a clear rectangular card with generous light empty interior for text overlay.
4) Optional warning band (~8% height): one horizontal alert card with light empty interior.
5) Bottom footer band (~8% height): light empty strip for disclaimer text.

CRITICAL: Absolutely NO text, words, letters, numbers, labels, captions, watermarks, or typography anywhere in the image. Design and decorative graphics only.
`;

const STYLE_PROMPTS: Record<"A" | "B", string> = {
  A: `Clinical professional medical infographic background design. Deep navy blue and soft ice-blue color palette. Clean horizontal bands, subtle abstract medical motifs in corners (cross, heartbeat line, molecule shapes — decorative only). White and pale blue empty zones in each layout band. Polished hospital-grade poster aesthetic. ${SHARED_LAYOUT}`,

  B: `Modern friendly patient infographic background design. Teal, mint green, and soft white color palette. Soft organic rounded shapes, airy whitespace, gentle gradient accents. Rounded card panels with subtle shadows. Warm approachable wellness aesthetic. ${SHARED_LAYOUT}`,
};

export async function generateDesignImage(
  style: "A" | "B",
  diagnosis: string,
): Promise<string> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Add OPENAI_API_KEY in Vercel Environment Variables.",
    );
  }

  const prompt = `${STYLE_PROMPTS[style]} Topic context (visual mood only, do not write this as text): ${diagnosis}.`;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getInfographicImageModel(),
      prompt,
      size: "1024x1536",
      quality: "high",
      output_format: "jpeg",
      output_compression: 85,
    }),
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
  return `data:image/jpeg;base64,${b64}`;
}

export async function generateBothDesignImages(
  diagnosis: string,
): Promise<{ imageA: string; imageB: string }> {
  const [imageA, imageB] = await Promise.all([
    generateDesignImage("A", diagnosis),
    generateDesignImage("B", diagnosis),
  ]);
  return { imageA, imageB };
}
