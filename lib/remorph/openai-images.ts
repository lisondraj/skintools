import { getOpenAiKey } from "@/lib/skinlog/env";

const DEFAULT_IMAGE_MODEL = "gpt-image-1";

export function getImageModel(): string {
  return process.env["OPENAI_IMAGE_MODEL"]?.trim() || DEFAULT_IMAGE_MODEL;
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL.");
  const buf = Buffer.from(match[2], "base64");
  const copy = new Uint8Array(buf.length);
  copy.set(buf);
  return copy.buffer;
}

export async function generateLesionImage(userPrompt: string): Promise<string> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Add OPENAI_API_KEY in Vercel Environment Variables.",
    );
  }

  const prompt = `Clinical dermatology close-up photograph, macro detail of skin. ${userPrompt}. Photorealistic, neutral clinical lighting, sharp focus on skin surface texture. No text, no labels, no watermarks.`;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getImageModel(),
      prompt,
      size: "1024x1024",
      quality: "medium",
    }),
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
  return `data:image/png;base64,${b64}`;
}

export async function editLesionImage(
  image: string,
  prompt: string,
  mask?: string,
): Promise<string> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Add OPENAI_API_KEY in Vercel Environment Variables.",
    );
  }

  const form = new FormData();
  form.append("model", getImageModel());
  form.append("prompt", prompt);
  form.append("input_fidelity", "high");
  form.append("size", "1024x1024");
  form.append(
    "image",
    new Blob([dataUrlToArrayBuffer(image)], { type: "image/png" }),
    "image.png",
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
  return `data:image/png;base64,${b64}`;
}
