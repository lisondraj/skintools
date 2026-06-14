import { getOpenAiKey, getOpenAiModel } from "@/lib/skinlog/env";
import type { RemorphRegion, SegmentResponse } from "@/lib/remorph/types";

type OpenAiSegmentPayload = {
  regions: Array<{
    label?: string;
    category?: string;
    polygon?: Array<[number, number] | { x?: number; y?: number }>;
  }>;
};

const SEGMENT_PROMPT = `You are a dermatology image segmentation assistant for a region-targeted photo editor.

Analyze this clinical close-up skin photo and identify distinct visual regions the user may want to edit separately.

Return regions for:
1. All visible background skin (category: "skin") — the normal skin surface NOT part of a distinct lesion. Use one polygon tracing the overall skin area.
2. Each distinct skin finding as its own region with a morphology category slug, e.g. "papule", "macule", "plaque", "patch", "nodule", "pustule", "vesicle", "scale", "scar", "erythema", "hyperpigmentation", etc.

Rules:
- Use lowercase slug categories. All papules share category "papule", all macules share "macule", etc.
- Each region needs a short human-readable label (e.g. "Background skin", "Erythematous papule (upper left)").
- polygon: 4–12 points as [x, y] pairs tracing the feature boundary. Coordinates are normalized 0.0–1.0 (0 = left/top edge, 1 = right/bottom edge).
- Polygons should tightly wrap each feature. Do not overlap skin and lesion polygons heavily.
- Do NOT diagnose. Describe morphology only.
- Include at least the "skin" region if any skin is visible.

Return JSON only:
{
  "regions": [
    {
      "label": "Background skin",
      "category": "skin",
      "polygon": [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]
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

function normalizePolygon(
  raw: OpenAiSegmentPayload["regions"][number]["polygon"],
): [number, number][] {
  if (!Array.isArray(raw)) return [];

  const points: [number, number][] = [];
  for (const point of raw) {
    if (Array.isArray(point) && point.length >= 2) {
      points.push([clamp01(Number(point[0])), clamp01(Number(point[1]))]);
    } else if (point && typeof point === "object") {
      const obj = point as { x?: number; y?: number };
      if (typeof obj.x === "number" && typeof obj.y === "number") {
        points.push([clamp01(obj.x), clamp01(obj.y)]);
      }
    }
  }

  return points;
}

function fallbackCirclePolygon(
  points: [number, number][],
): [number, number][] {
  if (points.length >= 3) return points;

  const cx =
    points.length > 0
      ? points.reduce((sum, p) => sum + p[0], 0) / points.length
      : 0.5;
  const cy =
    points.length > 0
      ? points.reduce((sum, p) => sum + p[1], 0) / points.length
      : 0.5;
  const r = 0.04;
  const circle: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    circle.push([
      clamp01(cx + Math.cos(angle) * r),
      clamp01(cy + Math.sin(angle) * r),
    ]);
  }
  return circle;
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

  const regions: RemorphRegion[] = (parsed.regions ?? [])
    .map((region) => {
      const category = normalizeCategory(region.category ?? "region");
      const label = region.label?.trim() || category;
      const polygon = fallbackCirclePolygon(normalizePolygon(region.polygon));
      if (polygon.length < 3) return null;

      return {
        id: crypto.randomUUID(),
        label,
        category,
        polygon,
      };
    })
    .filter((region): region is RemorphRegion => region !== null);

  if (regions.length === 0) {
    throw new Error("No editable regions were detected in this image.");
  }

  return { regions };
}
