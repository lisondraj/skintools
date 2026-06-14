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

  const userPrompt = `Create detailed patient education infographic content for an Ontario, Canada dermatology clinic.

Diagnosis: ${diagnosis}
Additional clinical context: ${instructions?.trim() || "(none — generate comprehensive evidence-based content)"}
Output language: ${language}

You are writing for Ontario patients. Include Ontario-specific references where appropriate:
- Mention OHIP coverage status if relevant (e.g. specialist referrals, prescribed topicals)
- Reference Telehealth Ontario (1-800-797-0000) as an after-hours resource
- Mention Ontario Dermatology Alliance or ontario.ca/health for further reading where suitable
- Use Canadian spelling (colour, behaviour, centre, etc.) when language is English

Respond with valid JSON (no markdown fences) matching exactly this shape:
{
  "title": "Condition name + patient guide — 35-55 chars in ${language}",
  "subtitle": "One-line clinical context — under 65 chars in ${language}",
  "keyFacts": [
    "Epidemiological or clinical fact — under 40 chars in ${language}",
    "Prevalence or cause fact — under 40 chars",
    "Treatment response stat — under 40 chars",
    "Ontario/Canada relevance fact — under 40 chars"
  ],
  "sections": [
    {
      "id": "s1",
      "heading": "What Is ${diagnosis}? — under 35 chars in ${language}",
      "body": "3-4 sentences: definition, mechanism, prevalence in Canada, who is typically affected. Be medically accurate but plain-language (grade 7-8 reading level).",
      "type": "info"
    },
    {
      "id": "s2",
      "heading": "Signs & Symptoms — under 35 chars in ${language}",
      "body": "3-4 sentences describing the primary and secondary signs. Mention typical progression or variability. Note any features specific to skin of colour if relevant.",
      "type": "info"
    },
    {
      "id": "s3",
      "heading": "Triggers & Risk Factors — under 35 chars in ${language}",
      "body": "3-4 sentences on known triggers, environmental factors, and patient-modifiable risks. Include Ontario climate/seasonal factors if applicable.",
      "type": "note"
    },
    {
      "id": "s4",
      "heading": "Treatment Options — under 35 chars in ${language}",
      "body": "3-4 sentences covering first-line treatments, prescription options covered by ODB/OHIP, lifestyle modifications, and realistic treatment timelines.",
      "type": "tip"
    },
    {
      "id": "s5",
      "heading": "When to See Your Doctor — under 35 chars in ${language}",
      "body": "3-4 sentences on red-flag symptoms warranting urgent care, routine follow-up intervals, and how to access Ontario dermatology services (GP referral to dermatologist).",
      "type": "warning"
    },
    {
      "id": "s6",
      "heading": "Ontario Resources — under 35 chars in ${language}",
      "body": "3-4 sentences: Telehealth Ontario 1-800-797-0000 for after-hours advice, ontario.ca/health for information, Ontario Dermatology Alliance patient resources, and local public health unit support.",
      "type": "note"
    }
  ],
  "warning": "One critical safety reminder sentence in ${language} (e.g. do not stop medication without advice), or null if not applicable",
  "footer": "Disclaimer referencing Ontario healthcare — under 90 chars in ${language}"
}

Rules:
- ALL text output in ${language}
- Canadian spelling if language is English
- Medically accurate, evidence-based content appropriate for Ontario dermatology patients
- Each section body: exactly 3-4 sentences, substantive and informative
- Exactly 6 sections in the order shown
- keyFacts: exactly 4 items, each a standalone punchy fact with a number or statistic where possible
- Section types must be one of: info, tip, warning, note`;

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
            "You are a senior medical education specialist working with Ontario dermatology clinics. You write evidence-based, medically accurate patient education content aligned with Ontario Health and Canadian Dermatology Association guidelines. Output valid JSON only — no prose, no markdown, no code fences.",
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
            "You are a medical education specialist for Ontario dermatology clinics. Write concise, evidence-based patient education notes aligned with Ontario Health guidelines.",
        },
        {
          role: "user",
          content: `Write 4-5 bullet-point clinical instructions for a patient infographic about "${diagnosis}" for an Ontario, Canada dermatology clinic. Cover: what it is, how to manage it, what to avoid, OHIP/ODB coverage notes if relevant, and when to call Telehealth Ontario (1-800-797-0000) or see a dermatologist. Use plain language (grade 7-8). Use Canadian spelling. Write in ${language}.`,
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
