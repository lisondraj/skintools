import type { TranslateRequest, TranslateResponse } from "@/lib/translate/types";

async function parseJson<T>(response: Response): Promise<T & { error?: string }> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}

export async function translateText(req: TranslateRequest): Promise<TranslateResponse> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return parseJson<TranslateResponse>(response);
}

export async function checkTranslateConfigured(): Promise<boolean> {
  const response = await fetch("/api/translate");
  const data = await parseJson<{ configured: boolean }>(response);
  return Boolean(data.configured);
}
