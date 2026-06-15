import type {
  AutofillReq,
  AutofillRes,
  GenerateDeckReq,
  GenerateDeckRes,
  GenerateImageReq,
  GenerateImageRes,
  RealtimeSessionReq,
  RealtimeSessionRes,
  SlideLayoutRes,
} from "./types";

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

export async function autofillSlide(req: Omit<AutofillReq, "mode">): Promise<SlideLayoutRes> {
  const response = await fetch("/api/modules/autofill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, mode: "slide" }),
  });
  return parseJson<SlideLayoutRes>(response);
}

export async function generateSlideImage(req: GenerateImageReq): Promise<string> {
  const response = await fetch("/api/modules/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const data = await parseJson<GenerateImageRes>(response);
  return data.image;
}

export async function generateDeck(req: GenerateDeckReq): Promise<GenerateDeckRes> {
  const response = await fetch("/api/modules/generate-deck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return parseJson<GenerateDeckRes>(response);
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
