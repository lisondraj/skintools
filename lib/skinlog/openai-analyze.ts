import { getOpenAiKey, getOpenAiModel } from "@/lib/skinlog/env";
import type { AnalyzeResponse, ScanMode } from "@/lib/skinlog/types";

type OpenAiFindingPayload = {
  lesions: Array<{
    bodyLocation?: string;
    description: string;
    anchorX?: number;
    anchorY?: number;
    attributes: {
      morphology: string;
      size: string;
      color: string;
      distribution: string;
      surface: string;
    };
  }>;
};

function buildPrompt(mode: ScanMode): string {
  const scope =
    mode === "single"
      ? "The patient is photographing a specific skin area for documentation."
      : "The patient is doing a full-body skin survey. Identify every visible skin finding in this photo.";

  return `${scope}

You are a dermatology documentation assistant helping patients log skin findings for personal tracking. This is NOT for diagnosis.

Analyze the image and describe all visible skin findings — including any of the following: macules, patches, papules, plaques, nodules, cysts, vesicles, bullae, pustules, erosions, excoriations, fissures, ulcers, scales, crusts, lichenification, atrophy, scarring, telangiectasias, purpura, petechiae, pigmentation changes, textural changes, erythema, hypopigmentation, hyperpigmentation, or any other visible dermatological finding.

Do NOT name or imply a diagnosis. Do NOT use disease names. Use descriptive morphological language only (e.g. "an erythematous scaly plaque" not "psoriasis"). Describe what you see, not what it might be.

For each finding, return:
- bodyLocation: specific anatomical location (e.g. "left forearm, volar surface", "upper back, right of midline")
- description: 2-3 sentence objective description of what is visible
- anchorX: approximate horizontal center of this finding as a decimal fraction of the image width (0.0 = left edge, 1.0 = right edge)
- anchorY: approximate vertical center of this finding as a decimal fraction of the image height (0.0 = top edge, 1.0 = bottom edge)
- attributes:
  - morphology: primary lesion type(s) using standard dermatology terms (e.g. "erythematous papules", "hyperpigmented patch", "scaly plaque", "atrophic scar", "vesicles on an erythematous base")
  - size: estimated dimensions or extent (e.g. "~5 mm", "~3 × 2 cm", "diffuse, covering ~20% of the upper back")
  - color: precise color and tone description (e.g. "pink-red", "brown with darker border", "white with surrounding erythema")
  - distribution: spatial arrangement (e.g. "solitary", "clustered", "linear", "scattered", "confluent", "bilateral and symmetric", "dermatomal")
  - surface: surface quality (e.g. "smooth", "fine scale", "thick adherent crust", "lichenified", "atrophic and depressed", "moist and eroded")

Return JSON only with this exact shape:
{
  "lesions": [
    {
      "bodyLocation": "string",
      "description": "string",
      "anchorX": 0.5,
      "anchorY": 0.5,
      "attributes": {
        "morphology": "string",
        "size": "string",
        "color": "string",
        "distribution": "string",
        "surface": "string"
      }
    }
  ]
}`;
}

export async function analyzeSkinPhoto(
  photo: string,
  mode: ScanMode,
): Promise<AnalyzeResponse> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. On Vercel: Project → Settings → Environment Variables → add OPENAI_API_KEY for Production, then redeploy.",
    );
  }

  const model = getOpenAiModel();

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

  let parsed: OpenAiFindingPayload;
  try {
    parsed = JSON.parse(content) as OpenAiFindingPayload;
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }

  const lesions = (parsed.lesions ?? []).map((f) => ({
    id: crypto.randomUUID(),
    bodyLocation: f.bodyLocation,
    description: f.description,
    anchorX: typeof f.anchorX === "number" ? Math.min(1, Math.max(0, f.anchorX)) : undefined,
    anchorY: typeof f.anchorY === "number" ? Math.min(1, Math.max(0, f.anchorY)) : undefined,
    attributes: {
      morphology: f.attributes.morphology,
      size: f.attributes.size,
      color: f.attributes.color,
      distribution: f.attributes.distribution,
      surface: f.attributes.surface,
    },
  }));

  if (lesions.length === 0) {
    throw new Error(
      "No findings were detected in this photo. Try better lighting or move closer.",
    );
  }

  return { lesions };
}
