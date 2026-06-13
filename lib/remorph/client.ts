import type { EditRequest, GenerateRequest, ImageResponse } from "@/lib/remorph/types";

async function parseJsonResponse(response: Response): Promise<ImageResponse> {
  const data = (await response.json()) as ImageResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
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
  const data = await parseJsonResponse(response);
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
  const data = await parseJsonResponse(response);
  return data.image;
}
