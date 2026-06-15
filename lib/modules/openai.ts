import { getOpenAiKey } from "@/lib/skinlog/env";
import type { AutofillMode } from "./types";

type AutofillOptions = {
  prompt?: string;
  existingText?: string;
  selectedText?: string;
  selectionStart?: number;
  selectionEnd?: number;
  deckTitle?: string;
  slideContext?: string;
};

function modeInstruction(mode: AutofillMode, hasSelection: boolean): string {
  const scope = hasSelection
    ? "Apply this ONLY to the highlighted selection. Return the full text box content with the selection replaced — keep all other text exactly unchanged."
    : "Apply to the entire text box.";

  switch (mode) {
    case "generate":
      return "Write new slide text from scratch based on the prompt and slide context.";
    case "rewrite":
      return `Rewrite to improve clarity and patient-friendly tone while preserving meaning. ${scope}`;
    case "expand":
      return `Expand with helpful detail while staying concise for a slide. ${scope}`;
    case "shorten":
      return `Shorten while keeping the key message. ${scope}`;
    case "slide":
      return "Create a full slide with a title and body for a dermatology presentation.";
    case "edit-selection":
      return "Edit ONLY the highlighted selection according to the user's instruction. Return the full text box with the selection replaced — keep all other text exactly unchanged.";
    case "simplify":
      return `Rewrite in plain, patient-friendly language (grade 8 reading level). ${scope}`;
    case "clinical":
      return `Rewrite in professional clinical language suitable for dermatology trainees. ${scope}`;
    case "bullets":
      return `Convert to scannable bullet points (use • prefix). ${scope}`;
    case "grammar":
      return `Fix grammar, spelling, and punctuation only — do not change meaning. ${scope}`;
    case "summarize":
      return `Summarize to the most important points. ${scope}`;
    case "notes":
      return "Write concise speaker notes for the presenter (2-4 sentences). Notes should expand on slide content, not repeat it verbatim.";
  }
}

function buildUserPrompt(mode: AutofillMode, options: AutofillOptions): string {
  const hasSelection = Boolean(options.selectedText?.trim());
  const contextBlock = options.slideContext?.trim()
    ? `\n\n--- Slide & deck context ---\n${options.slideContext.trim()}\n--- End context ---`
    : "";

  if (mode === "notes") {
    return `Write speaker notes for this slide.${contextBlock}

Return ONLY the speaker notes text — no labels or markdown.`;
  }

  if (mode === "edit-selection") {
    if (!options.selectedText?.trim() || !options.existingText?.trim()) {
      throw new Error("Selection and full text are required.");
    }
    if (!options.prompt?.trim()) {
      throw new Error("Describe how to edit the selection.");
    }
    return `${modeInstruction(mode, true)}

User instruction: ${options.prompt.trim()}
Full text box:
${options.existingText}

Highlighted selection to edit:
${options.selectedText}
${contextBlock}

Return the COMPLETE updated text box content with only the selection changed.`;
  }

  const selectionBlock = hasSelection
    ? `\nHighlighted selection (edit only this part):\n${options.selectedText}\n\nFull text box:\n${options.existingText}`
    : `\nText to edit:\n${options.existingText || "(empty)"}`;

  return `${modeInstruction(mode, hasSelection)}

Presentation title: ${options.deckTitle?.trim() || "(untitled)"}
User prompt: ${options.prompt?.trim() || "(none)"}
${selectionBlock}
${contextBlock}

Return ONLY the final text — no quotes, no markdown, no labels.${hasSelection ? " Return the COMPLETE text box with the selection updated." : " Keep it suitable for a presentation text box."}`;
}

export async function autofillText(
  mode: AutofillMode,
  options: AutofillOptions,
): Promise<string> {
  const key = getOpenAiKey();
  if (!key) throw new Error("OpenAI API key not configured.");

  const userPrompt = buildUserPrompt(mode, options);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: mode === "grammar" ? 0.3 : 0.7,
      messages: [
        {
          role: "system",
          content:
            "You write clear dermatology presentation copy for Ontario clinics — patient education and clinician training. Use Canadian spelling. When editing a selection within a text box, return the complete text box with only that selection changed.",
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

function normalizeSlideField(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter(Boolean)
      .map((line) => (line.startsWith("•") ? line : `• ${line}`))
      .join("\n");
  }
  if (value == null) return "";
  return String(value).trim();
}

export async function autofillSlideLayout(options: {
  prompt: string;
  deckTitle?: string;
  slideContext?: string;
}): Promise<{ title: string; body: string }> {
  const key = getOpenAiKey();
  if (!key) throw new Error("OpenAI API key not configured.");

  const contextBlock = options.slideContext?.trim()
    ? `\n\n--- Slide & deck context ---\n${options.slideContext.trim()}\n--- End context ---`
    : "";

  const userPrompt = `Create slide content for a dermatology presentation.

Topic/prompt: ${options.prompt.trim()}
${contextBlock}

Return JSON only:
{"title":"short slide title","body":"2-4 bullet points or short paragraphs for the slide body"}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write clear, patient-friendly dermatology presentation copy for Ontario clinics. Return valid JSON only.",
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

  const raw = data.choices[0]?.message.content?.trim();
  if (!raw) throw new Error("Empty response from OpenAI.");

  const parsed = JSON.parse(raw) as {
    title?: unknown;
    body?: unknown;
    bullets?: unknown;
  };
  return {
    title: normalizeSlideField(parsed.title) || "Untitled",
    body: normalizeSlideField(parsed.body ?? parsed.bullets),
  };
}
