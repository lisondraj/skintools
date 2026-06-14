import { getOpenAiKey } from "@/lib/skinlog/env";
import type { AutofillMode } from "./types";

function modeInstruction(mode: AutofillMode): string {
  switch (mode) {
    case "generate":
      return "Write new slide text from scratch based on the prompt and context.";
    case "rewrite":
      return "Rewrite the existing text to improve clarity and patient-friendly tone while preserving meaning.";
    case "expand":
      return "Expand the existing text with helpful detail while staying concise for a slide.";
    case "shorten":
      return "Shorten the existing text while keeping the key message.";
  }
}

export async function autofillText(
  mode: AutofillMode,
  options: {
    prompt?: string;
    existingText?: string;
    deckTitle?: string;
    slideContext?: string;
  },
): Promise<string> {
  const key = getOpenAiKey();
  if (!key) throw new Error("OpenAI API key not configured.");

  const userPrompt = `${modeInstruction(mode)}

Presentation title: ${options.deckTitle?.trim() || "(untitled)"}
Slide context: ${options.slideContext?.trim() || "(general dermatology education slide)"}
User prompt: ${options.prompt?.trim() || "(none)"}
Existing text: ${options.existingText?.trim() || "(empty)"}

Return ONLY the final slide text — no quotes, no markdown, no labels. Keep it suitable for a presentation text box (roughly 1-4 short sentences unless expanding).`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You write clear, patient-friendly dermatology presentation copy for clinicians and trainees.",
        },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const text = data.choices[0]?.message.content?.trim();
  if (!text) throw new Error("Empty response from OpenAI.");
  return text;
}
