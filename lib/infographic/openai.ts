import { getOpenAiKey } from "@/lib/skinlog/env";
import type { IGSection, InfographicContent } from "./types";

const SECTION_TYPES = ["info", "tip", "warning", "note"] as const;

export async function generateContent(
  diagnosis: string,
  instructions: string,
  language: string,
): Promise<InfographicContent> {
  const key = getOpenAiKey();
  if (!key) throw new Error("OpenAI API key not configured.");

  const userPrompt = `Create patient education infographic content.

Diagnosis: ${diagnosis}
Additional context: ${instructions?.trim() || "(none — generate appropriate general content)"}
Language: ${language}

Respond with valid JSON (no markdown fences) matching exactly this shape:
{
  "title": "Main infographic title in ${language} — 30-50 chars",
  "subtitle": "Short tagline in ${language} — under 60 chars",
  "keyFacts": [
    "Fact 1 — under 32 chars in ${language}",
    "Fact 2 — under 32 chars",
    "Fact 3 — under 32 chars"
  ],
  "sections": [
    { "id": "s1", "heading": "Heading in ${language} — under 30 chars", "body": "2-3 sentences of clear plain-language content in ${language}.", "type": "info" },
    { "id": "s2", "heading": "...", "body": "...", "type": "info" },
    { "id": "s3", "heading": "Treatment / What to Do", "body": "...", "type": "tip" },
    { "id": "s4", "heading": "When to Seek Help", "body": "...", "type": "warning" }
  ],
  "warning": "One-sentence safety reminder in ${language}, or null",
  "footer": "Disclaimer under 80 chars in ${language}"
}

Rules:
- ALL text in ${language}
- Plain language for patients, reading level grade 6-8
- Each section body: 2-3 sentences max
- Exactly 4 sections, types must be info/tip/warning/note`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a medical education content specialist. Output valid JSON only — no prose, no code fences.",
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
  const raw = data.choices[0]?.message.content;
  if (!raw) throw new Error("Empty response from OpenAI.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }

  const sections: IGSection[] = (
    (parsed.sections as unknown[]) ?? []
  ).map((s, i) => {
    const sec = s as Record<string, unknown>;
    return {
      id: String(sec.id ?? `s${i + 1}`),
      heading: String(sec.heading ?? `Section ${i + 1}`),
      body: String(sec.body ?? ""),
      type: SECTION_TYPES.includes(
        sec.type as (typeof SECTION_TYPES)[number],
      )
        ? (sec.type as IGSection["type"])
        : "info",
    };
  });

  return {
    title: String(parsed.title ?? diagnosis),
    subtitle: String(parsed.subtitle ?? "Patient Guide"),
    keyFacts: ((parsed.keyFacts as unknown[]) ?? []).map(String).slice(0, 3),
    sections,
    warning: parsed.warning ? String(parsed.warning) : null,
    footer: String(
      parsed.footer ??
        "Consult your healthcare provider for personalized medical advice.",
    ),
  };
}

export async function generateInstructions(
  diagnosis: string,
  language: string,
): Promise<string> {
  const key = getOpenAiKey();
  if (!key) throw new Error("OpenAI API key not configured.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You write concise, practical patient education notes for infographics.",
        },
        {
          role: "user",
          content: `Write 3-4 bullet-point style instructions for a patient infographic about "${diagnosis}". Cover: what it is, what to do, what to avoid, when to see a doctor. Keep it plain-language. Write in ${language}.`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error("Failed to generate instructions.");

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message.content ?? "";
}
