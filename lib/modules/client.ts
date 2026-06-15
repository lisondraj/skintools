import type { AutofillReq, AutofillRes, RealtimeSessionReq, RealtimeSessionRes } from "./types";

async function parseJson<T>(response: Response): Promise<T & { error?: string }> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}

export async function autofillText(req: AutofillReq): Promise<string> {
  const response = await fetch("/api/modules/autofill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const data = await parseJson<AutofillRes>(response);
  return data.text;
}

export async function autofillSlide(req: Omit<AutofillReq, "mode">): Promise<{ title: string; body: string }> {
  const response = await fetch("/api/modules/autofill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, mode: "slide" }),
  });
  return parseJson<{ title: string; body: string }>(response);
}

export async function createRealtimeSession(
  req: RealtimeSessionReq,
): Promise<RealtimeSessionRes & { instructions: string }> {
  const response = await fetch("/api/modules/realtime-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return parseJson<RealtimeSessionRes & { instructions: string }>(response);
}
