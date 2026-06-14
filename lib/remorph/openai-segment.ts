import { getOpenAiKey, getOpenAiModel } from "@/lib/skinlog/env";
import type { RemorphFeature, SegmentResponse } from "@/lib/remorph/types";

type OpenAiSegmentPayload = {
  features?: Array<{
    label?: string;
    category?: string;
    point?: [number, number] | { x?: number; y?: number };
    box?: [number, number, number, number];
  }>;
};

const SEGMENT_PROMPT = `You are a dermatology image analysis assistant for a region-targeted photo editor.

Analyze this clinical close-up skin photo and list every distinct skin FINDING (lesion) the user may want to edit separately.

Do NOT include background/normal skin. List only distinct findings such as: macules, patches, papules, plaques, nodules, pustules, vesicles, scales, crusts, scars, erythema, hyperpigmentation, hypopigmentation, etc.

For each finding return:
- category: lowercase morphology slug (e.g. "papule", "macule", "pustule", "plaque")
- label: short human-readable description (e.g. "Erythematous pustule (center-right)")
- point: [x, y] normalized center of the finding (0.0 = left/top edge, 1.0 = right/bottom edge)
- box: [x, y, w, h] normalized tight bounding box around the finding (x,y = top-left corner, w,h = width/height as fractions of image)

Rules:
- All coordinates normalized 0.0–1.0 relative to the full image.
- point must lie inside box.
- box should tightly wrap the visible finding.
- Multiple findings of the same category are separate entries (e.g. two papules = two features).
- Do NOT diagnose. Use morphological language only.
- If no findings are visible, return an empty features array.

Return JSON only:
{
  "features": [
    {
      "label": "Dark brown macule (left)",
      "category": "macule",
      "point": [0.35, 0.52],
      "box": [0.28, 0.45, 0.12, 0.12]
    }
  ]
}`;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeCategory(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizePoint(raw: unknown): [number, number] | null {
  if (Array.isArray(raw) && raw.length >= 2) {
    return [clamp01(Number(raw[0])), clamp01(Number(raw[1]))];
  }
  if (raw && typeof raw === "object") {
    const obj = raw as { x?: number; y?: number };
    if (typeof obj.x === "number" && typeof obj.y === "number") {
      return [clamp01(obj.x), clamp01(obj.y)];
    }
  }
  return null;
}

function normalizeBox(
  raw: [number, number, number, number] | undefined,
  point: [number, number],
): [number, number, number, number] {
  if (Array.isArray(raw) && raw.length >= 4) {
    const x = clamp01(Number(raw[0]));
    const y = clamp01(Number(raw[1]));
    const w = Math.max(0.02, clamp01(Number(raw[2])));
    const h = Math.max(0.02, clamp01(Number(raw[3])));
    return [x, y, Math.min(w, 1 - x), Math.min(h, 1 - y)];
  }

  const size = 0.08;
  return [
    clamp01(point[0] - size / 2),
    clamp01(point[1] - size / 2),
    size,
    size,
  ];
}

export async function segmentRemorphImage(
  photo: string,
): Promise<SegmentResponse> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Add OPENAI_API_KEY in Vercel Environment Variables.",
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
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SEGMENT_PROMPT },
            { type: "image_url", image_url: { url: photo } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI segmentation failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty segmentation response.");
  }

  let parsed: OpenAiSegmentPayload;
  try {
    parsed = JSON.parse(content) as OpenAiSegmentPayload;
  } catch {
    throw new Error("OpenAI returned invalid segmentation JSON.");
  }

  const features: RemorphFeature[] = (parsed.features ?? [])
    .map((feature) => {
      const point = normalizePoint(feature.point);
      if (!point) return null;

      const category = normalizeCategory(feature.category ?? "finding");
      const label = feature.label?.trim() || category;
      const bbox = normalizeBox(feature.box, point);

      return {
        id: crypto.randomUUID(),
        label,
        category,
        seed: point,
        bbox,
      };
    })
    .filter((feature): feature is RemorphFeature => feature !== null);

  return { features };
}
