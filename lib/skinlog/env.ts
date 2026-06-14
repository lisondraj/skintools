/**
 * Read OpenAI key at request time.
 * Bracket access avoids Next.js inlining undefined at build when the var
 * isn't present locally during `next build`.
 */
export function getOpenAiKey(): string | undefined {
  const key = process.env["OPENAI_API_KEY"];
  return key?.trim() || undefined;
}

export function getOpenAiModel(): string {
  const model = process.env["OPENAI_VISION_MODEL"];
  return model?.trim() || "gpt-4o-mini";
}

export function isOpenAiConfigured(): boolean {
  return Boolean(getOpenAiKey());
}

export function getRealtimeModel(): string {
  return (
    process.env["OPENAI_REALTIME_MODEL"]?.trim() || "gpt-realtime"
  );
}

export function getDefaultRealtimeVoice(): string {
  return process.env["OPENAI_REALTIME_VOICE"]?.trim() || "alloy";
}
