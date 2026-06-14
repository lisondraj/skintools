import type {
  EditRequest,
  GenerateRequest,
  ImageResponse,
  RemorphQualityMode,
  SegmentRequest,
  SegmentResponse,
} from "@/lib/remorph/types";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}

async function parseImageResponse(response: Response): Promise<ImageResponse> {
  const data = await parseJsonResponse<ImageResponse>(response);
  if (!data.image) {
    throw new Error("No image returned from server.");
  }
  return data;
}

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

export async function generateImageStream(
  prompt: string,
  qualityMode: RemorphQualityMode,
  onPartial: (image: string) => void,
): Promise<string> {
  const response = await fetch("/api/remorph/generate/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, qualityMode } satisfies GenerateRequest),
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

export async function generateImage(
  prompt: string,
  qualityMode: RemorphQualityMode = "fast",
): Promise<string> {
  const response = await fetch("/api/remorph/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, qualityMode } satisfies GenerateRequest),
  });
  const data = await parseImageResponse(response);
  return data.image;
}

export async function editImage({
  image,
  mask,
  prompt,
  qualityMode = "fast",
}: EditRequest): Promise<string> {
  const response = await fetch("/api/remorph/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, mask, prompt, qualityMode } satisfies EditRequest),
  });
  const data = await parseImageResponse(response);
  return data.image;
}

export async function segmentImage(image: string): Promise<SegmentResponse> {
  const response = await fetch("/api/remorph/segment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image } satisfies SegmentRequest),
  });
  return parseJsonResponse<SegmentResponse>(response);
}
