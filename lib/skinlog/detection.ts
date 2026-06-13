import type { AnalyzeResponse, ScanMode } from "@/lib/skinlog/types";

/**
 * Client-side entry point for lesion analysis.
 * Calls the Next.js API route — the OpenAI key never reaches the browser.
 */
export async function generateLesionsFromCapture(
  photo: string,
  mode: ScanMode,
): Promise<AnalyzeResponse> {
  const response = await fetch("/api/skinlog/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo, mode }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "Analysis request failed.");
  }

  return response.json() as Promise<AnalyzeResponse>;
}
