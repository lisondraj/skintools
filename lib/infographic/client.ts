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

  // Non-stream JSON fallback
  const data = event.data as Array<{ b64_json?: string }> | undefined;
  const fallback = data?.[0]?.b64_json;
  if (fallback) return toDataUrl(fallback);

  return null;
}

/** Stream a single infographic variant; calls onPartial with progressive previews. */
export async function streamDesignImage(
  variant: "A" | "B",
  content: InfographicContent,
  language: string,
  qualityMode: InfographicQualityMode,
  onPartial: (image: string) => void,
): Promise<string> {
  const response = await fetch("/api/infographic/design/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variant, content, language, qualityMode }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error || `Request failed (${response.status}).`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No stream returned from server.");

  const decoder = new TextDecoder();
  let buffer = "";
  let finalImage = "";

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
            onPartial(image);
          } else {
            finalImage = image;
          }
        } catch {
          /* skip malformed SSE chunk */
        }
      }
    }
  }

  if (!finalImage) {
    throw new Error("No image returned from stream.");
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

  const data = (await response.json()) as { image?: string; error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  if (!data.image) throw new Error("No image returned from edit.");
  return data.image;
}
