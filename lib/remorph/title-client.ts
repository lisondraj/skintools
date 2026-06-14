import type { TitleRequest, TitleResponse } from "@/lib/remorph/types";

async function parseTitleResponse(response: Response): Promise<string> {
  const data = (await response.json()) as TitleResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  if (!data.title) {
    throw new Error("No title returned from server.");
  }
  return data.title;
}

export async function fetchImageTitle(image: string): Promise<string> {
  const response = await fetch("/api/remorph/title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image } satisfies TitleRequest),
  });
  return parseTitleResponse(response);
}
