import { mockLesionsFromCapture } from "@/lib/skinlog/mock-lesions";
import type { AnalyzeResponse, ScanMode } from "@/lib/skinlog/types";

const DEFAULT_MODEL = "gpt-4o-mini";

type OpenAiLesionPayload = {
  lesions: Array<{
    bodyLocation?: string;
    description: string;
    attributes: {
      size: string;
      color: string;
      shape: string;
      border: string;
      notes: string;
    };
  }>;
};

function shouldUseMock() {
  return (
    process.env.SKINLOG_AI_MOCK === "true" || !process.env.OPENAI_API_KEY?.trim()
  );
}

function buildPrompt(mode: ScanMode) {
  const scope =
    mode === "single"
      ? "Focus on the primary visible lesion in this photo."
      : "Identify every distinct visible skin lesion or mark you can see in this full-body photo.";

  return `${scope}

You are a dermatology documentation assistant for a patient skin log app.
Describe what you see for personal tracking only. Do NOT diagnose or name diseases.
Use cautious language like "area of interest" or "notable mark".

Return JSON only with this exact shape:
{
  "lesions": [
    {
      "bodyLocation": "string",
      "description": "1-2 sentence neutral description",
      "attributes": {
        "size": "estimated size or unknown",
        "color": "color description",
        "shape": "shape description",
        "border": "border description",
        "notes": "any other visible details"
      }
    }
  ]
}`;
}

export async function analyzeSkinPhoto(
  photo: string,
  mode: ScanMode,
): Promise<AnalyzeResponse> {
  if (shouldUseMock()) {
    return { lesions: mockLesionsFromCapture(mode), source: "mock" };
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const model = process.env.OPENAI_VISION_MODEL?.trim() || DEFAULT_MODEL;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(mode) },
            { type: "image_url", image_url: { url: photo } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  let parsed: OpenAiLesionPayload;
  try {
    parsed = JSON.parse(content) as OpenAiLesionPayload;
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }

  const lesions = (parsed.lesions ?? []).map((lesion) => ({
    id: crypto.randomUUID(),
    bodyLocation: lesion.bodyLocation,
    description: lesion.description,
    attributes: lesion.attributes,
  }));

  return {
    lesions: lesions.length > 0 ? lesions : mockLesionsFromCapture(mode),
    source: "openai",
  };
}

export function getAnalyzeStatus() {
  const mockMode = shouldUseMock();
  return {
    configured: !mockMode,
    mockMode,
    model: mockMode
      ? null
      : process.env.OPENAI_VISION_MODEL?.trim() || DEFAULT_MODEL,
  };
}
