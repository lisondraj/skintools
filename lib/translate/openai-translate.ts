import { getOpenAiKey, getOpenAiModel } from "@/lib/skinlog/env";
import type { TranslateResponse } from "@/lib/translate/types";

export async function translateText(
  text: string,
  targetLangLabel: string,
): Promise<TranslateResponse> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error(
      "OpenAI API key not found. Add OPENAI_API_KEY to environment variables.",
    );
  }

  const model = getOpenAiModel();
  const trimmed = text.trim();
  if (!trimmed) {
    return { translated: "", detectedLang: "Unknown" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You translate spoken conversation text for a live caption tool.
Detect the source language of the input.
Translate into ${targetLangLabel}.
If the text is already in ${targetLangLabel}, return it unchanged.
Return JSON only: { "translated": "...", "detectedLang": "language name in English" }`,
        },
        {
          role: "user",
          content: trimmed,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translation failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty translation response.");

  const parsed = JSON.parse(raw) as {
    translated?: unknown;
    detectedLang?: unknown;
  };

  return {
    translated:
      typeof parsed.translated === "string" ? parsed.translated.trim() : trimmed,
    detectedLang:
      typeof parsed.detectedLang === "string"
        ? parsed.detectedLang.trim()
        : "Unknown",
  };
}
