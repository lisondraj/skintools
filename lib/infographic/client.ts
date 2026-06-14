import type { InfographicContent, InfographicQualityMode } from "./types";

function toDataUrl(b64: string, mime = "image/jpeg"): string {
  return `data:${mime};base64,${b64}`;
}

function extractImageFromEvent(event: Record<string, unknown>): string | null {
  const type = event.type as string | undefined;
  const b64 = event.b64_json as string | undefined;

  if (
    b64 &&
    (type === "image_generation.partial_image" ||
      type === "image_generation.completed")
  ) {
    return toDataUrl(b64);
  }

  // Non-stream JSON fallback (completed event at top level)
  const data = event.data as Array<{ b64_json?: string }> | undefined;
  const fallback = data?.[0]?.b64_json;
  if (fallback) return toDataUrl(fallback);

  return null;
}

/** Parse a JSON response safely; returns null on parse failure. */
async function tryJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Fetch a single design image via the non-streaming design API.
 * Used as a fallback when streaming is unavailable or fails.
 */
async function fetchDesignImageFallback(
  variant: "A" | "B",
  content: InfographicContent,
  language: string,
  qualityMode: InfographicQualityMode,
): Promise<string> {
  const response = await fetch("/api/infographic/design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, language, qualityMode }),
  });

  const data = await tryJson(response);
  if (!response.ok || !data) {
    const errMsg = (data?.error as string | undefined) ?? `Request failed (${response.status}).`;
    throw new Error(errMsg);
  }

  const key = variant === "A" ? "imageA" : "imageB";
  const img = data[key] as string | undefined;
  if (!img) throw new Error(`No image returned for style ${variant}.`);
  return img;
}

/**
 * Stream a single infographic variant; calls onPartial only if provided (optional).
 * Partial frames are skipped by default in the UI — they often show garbled text.
 */
export async function streamDesignImage(
  variant: "A" | "B",
  content: InfographicContent,
  language: string,
  qualityMode: InfographicQualityMode,
  onPartial?: (image: string) => void,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/infographic/design/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variant, content, language, qualityMode }),
    });
  } catch {
    // Network-level failure (connection refused, etc.) — fall back to non-streaming.
    return fetchDesignImageFallback(variant, content, language, qualityMode);
  }

  if (!response.ok) {
    // Stream route returned an error — fall back to non-streaming.
    console.warn(`Infographic stream failed (${response.status}); falling back to non-streaming.`);
    return fetchDesignImageFallback(variant, content, language, qualityMode);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return fetchDesignImageFallback(variant, content, language, qualityMode);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalImage = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const event = JSON.parse(payload) as Record<string, unknown>;
            const image = extractImageFromEvent(event);
            if (!image) continue;

            if (event.type === "image_generation.partial_image") {
              onPartial?.(image);
            } else {
              finalImage = image;
            }
          } catch {
            /* skip malformed SSE chunk */
          }
        }
      }
    }
  } catch {
    // Stream read failed mid-way — if we have a partial image use it as fallback trigger.
    reader.cancel().catch(() => {});
    if (!finalImage) {
      return fetchDesignImageFallback(variant, content, language, qualityMode);
    }
  }

  if (!finalImage) {
    // Stream completed without a final image — try non-streaming.
    return fetchDesignImageFallback(variant, content, language, qualityMode);
  }

  return finalImage;
}

/** Edit a design image via the edit API. */
export async function editDesignImage(
  image: string,
  prompt: string,
  qualityMode: InfographicQualityMode,
): Promise<string> {
  const response = await fetch("/api/infographic/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, prompt, qualityMode }),
  });

  const data = await tryJson(response);
  if (!response.ok || !data) {
    const errMsg = (data?.error as string | undefined) ?? `Edit failed (${response.status}).`;
    throw new Error(errMsg);
  }
  const img = data.image as string | undefined;
  if (!img) throw new Error("No image returned from edit.");
  return img;
}
