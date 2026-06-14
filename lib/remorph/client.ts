import type {
  EditRequest,
  GenerateRequest,
  ImageResponse,
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

export async function generateImage(prompt: string): Promise<string> {
  const response = await fetch("/api/remorph/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt } satisfies GenerateRequest),
  });
  const data = await parseImageResponse(response);
  return data.image;
}

export async function editImage({
  image,
  mask,
  prompt,
}: EditRequest): Promise<string> {
  const response = await fetch("/api/remorph/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, mask, prompt } satisfies EditRequest),
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
