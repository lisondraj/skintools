import { getOpenAiKey } from "@/lib/skinlog/env";
import { normalizeGeneratedSlide } from "./deck-builder";
import { buildVisionUserContent } from "./openai-vision";
import {
  SLIDE_BACKGROUND_GUIDE,
  SLIDE_CONTENT_STYLE_GUIDE,
  SLIDE_INLINE_IMAGE_GUIDE,
  SLIDE_LAYOUT_PICK_GUIDE,
} from "./slide-content-guide";
import type { AutofillMode, GeneratedDeckSlide, SlideContextImage } from "./types";

type AutofillOptions = {
  prompt?: string;
  existingText?: string;
  selectedText?: string;
  selectionStart?: number;
  selectionEnd?: number;
  deckTitle?: string;
  slideContext?: string;
  contextImages?: SlideContextImage[];
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
      return `Convert to scannable bullet points (use • prefix, one per line). Include 5–8 substantive points or grouped ## sections — not three "Label: sentence" fragments. ${scope}`;
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

Return ONLY the final text — no quotes, no labels.${hasSelection ? " Return the COMPLETE text box with the selection updated." : " Keep it suitable for a presentation text box."}

${SLIDE_CONTENT_STYLE_GUIDE}

Formatting markup:
- **bold** for emphasis (sparingly)
- *italic* for terms
- # Heading line for section titles within the box
- ## Subheading for subsections
- • bullet lines (indent nested bullets with 2 leading spaces per level)
- Blank lines for paragraph breaks`;
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
            "You write clear dermatology presentation copy for Ontario clinics — patient education and clinician training. Use Canadian spelling. When slide images are attached, reference what you see in them. When editing a selection within a text box, return the complete text box with only that selection changed.",
        },
        {
          role: "user",
          content: buildVisionUserContent(userPrompt, options.contextImages),
        },
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
  contextImages?: SlideContextImage[];
}): Promise<GeneratedDeckSlide> {
  const key = getOpenAiKey();
  if (!key) throw new Error("OpenAI API key not configured.");

  const contextBlock = options.slideContext?.trim()
    ? `\n\n--- Slide & deck context ---\n${options.slideContext.trim()}\n--- End context ---`
    : "";

  const userPrompt = `Design one modern dermatology presentation slide with varied layout and rich content.

Topic/prompt: ${options.prompt.trim()}
Presentation title: ${options.deckTitle?.trim() || "(untitled)"}
${contextBlock}

Use the topic, presentation title, and any slide/deck context above when choosing layout, copy, backdrop theme, and imagePrompt — stay consistent with neighbouring slides when context is provided.

${SLIDE_CONTENT_STYLE_GUIDE}

${SLIDE_LAYOUT_PICK_GUIDE}

${SLIDE_INLINE_IMAGE_GUIDE}

${SLIDE_BACKGROUND_GUIDE}

Typography rules:
- Font is ALWAYS Inter — set titleFontStyle/bodyFontStyle to "inter".
- titleFontSize: 30–40. bodyFontSize: 18–22.
- titleColor and bodyColor are ALWAYS "#111111" and "#374151".

Return JSON only:
{
  "title": "slide title",
  "body": "rich body text with appropriate depth",
  "leftBody": "only if layout is two-column",
  "rightBody": "only if layout is two-column",
  "notes": "3–4 sentence speaker notes with extra detail not on the slide",
  "layout": "title-body | bullets | two-column | image-right | image-left",
  "backgroundStyle": "solid | ai",
  "backgroundImagePrompt": "only when backgroundStyle is ai — modern theme tied to this slide's title and body",
  "imagePrompt": "required for image-right/image-left; optional accent on title-body/bullets — must reference specific concepts from title/body; no text in image",
  "titleFontStyle": "inter",
  "bodyFontStyle": "inter",
  "titleFontSize": 34,
  "bodyFontSize": 20,
  "titleColor": "#111111",
  "bodyColor": "#374151",
  "titleAlign": "left | center"
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You design modern, substantive dermatology slides for Ontario clinics. Avoid repetitive bullet templates. Use varied structure and depth. Inline illustration vectors (image-right/image-left or imagePrompt) must visually match the specific slide copy you write. AI backdrops are separate full-slide backgrounds. When slide/deck context is provided, align with adjacent slides and the presentation theme. Return valid JSON only.",
        },
        {
          role: "user",
          content: buildVisionUserContent(userPrompt, options.contextImages),
        },
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

  const parsed = JSON.parse(raw) as Record<string, unknown>;

  return normalizeGeneratedSlide({
    title: normalizeSlideField(parsed.title) || "Untitled",
    body: normalizeSlideField(parsed.body) || undefined,
    leftBody: normalizeSlideField(parsed.leftBody) || undefined,
    rightBody: normalizeSlideField(parsed.rightBody) || undefined,
    notes: normalizeSlideField(parsed.notes) || undefined,
    layout: typeof parsed.layout === "string" ? parsed.layout : undefined,
    backgroundStyle:
      parsed.backgroundStyle === "white" || parsed.backgroundStyle === "solid" || parsed.backgroundStyle === "ai"
        ? parsed.backgroundStyle
        : undefined,
    background: typeof parsed.background === "string" ? parsed.background : undefined,
    backgroundImagePrompt:
      typeof parsed.backgroundImagePrompt === "string" ? parsed.backgroundImagePrompt : undefined,
    imagePrompt: typeof parsed.imagePrompt === "string" ? parsed.imagePrompt : undefined,
    titleFontStyle: typeof parsed.titleFontStyle === "string" ? parsed.titleFontStyle : undefined,
    bodyFontStyle: typeof parsed.bodyFontStyle === "string" ? parsed.bodyFontStyle : undefined,
    titleFontSize: typeof parsed.titleFontSize === "number" ? parsed.titleFontSize : undefined,
    bodyFontSize: typeof parsed.bodyFontSize === "number" ? parsed.bodyFontSize : undefined,
    titleColor: typeof parsed.titleColor === "string" ? parsed.titleColor : undefined,
    bodyColor: typeof parsed.bodyColor === "string" ? parsed.bodyColor : undefined,
    titleAlign:
      parsed.titleAlign === "left" || parsed.titleAlign === "center" || parsed.titleAlign === "right"
        ? parsed.titleAlign
        : undefined,
  } as Partial<GeneratedDeckSlide>);
}

export async function autofillDeck(options: {
  prompt: string;
  slideCount?: number;
  deckTitle?: string;
  slideContext?: string;
  contextImages?: SlideContextImage[];
}): Promise<{ deckTitle: string; slides: GeneratedDeckSlide[] }> {
  const key = getOpenAiKey();
  if (!key) throw new Error("OpenAI API key not configured.");

  const count = Math.min(Math.max(options.slideCount ?? 6, 3), 12);
  const contentSlides = Math.max(1, count - 2);
  const minImageSlides = Math.max(2, Math.ceil(contentSlides * 0.4));
  const maxImageSlides = Math.max(minImageSlides, Math.ceil(contentSlides * 0.5));

  const contextBlock = options.slideContext?.trim()
    ? `\n\n--- Existing deck context ---\n${options.slideContext.trim()}\n--- End context ---`
    : "";

  const userPrompt = `Create a complete modern dermatology presentation deck with varied layouts and substantive content.

Topic: ${options.prompt.trim()}
Number of slides: ${count}
${options.deckTitle?.trim() ? `Suggested deck title: ${options.deckTitle.trim()}` : ""}
${contextBlock}

${SLIDE_CONTENT_STYLE_GUIDE}

${SLIDE_INLINE_IMAGE_GUIDE}

${SLIDE_BACKGROUND_GUIDE}

Typography rules (every slide):
- Font is ALWAYS Inter — set titleFontStyle and bodyFontStyle to "inter".
- titleFontSize: 30–44 (title slide: 48). bodyFontSize: 18–22.
- titleColor is ALWAYS "#111111". bodyColor is ALWAYS "#374151".

Layout rules:
- First slide: layout "title" (large centered title + short subtitle). titleFontSize 48.
- Last slide: layout "bullets" for key takeaways.
- Vary layouts: use at least 4 different types.
- Use ${minImageSlides}–${maxImageSlides} slides with layout "image-right" or "image-left" (about 40–50% of content slides) — each MUST include imagePrompt tied to that slide's specific copy.
- Optionally add imagePrompt on 1–2 "title-body" or "bullets" slides for accent illustrations when a small visual helps.
- Use "two-column" for comparisons; "title-body" for narrative; "bullets" for lists.

Return JSON only:
{
  "deckTitle": "presentation title",
  "slides": [
    {
      "title": "slide title",
      "body": "rich body — ## sections, paragraphs, 5–9 bullets as appropriate",
      "leftBody": "only for two-column",
      "rightBody": "only for two-column",
      "notes": "3–4 sentence speaker notes with extra clinical detail",
      "layout": "title | title-body | bullets | two-column | image-right | image-left | image-hero",
      "backgroundStyle": "solid | ai",
      "backgroundImagePrompt": "only when backgroundStyle is ai — modern theme tied to this slide's title and body",
      "imagePrompt": "required for image-right/image-left; optional accent on title-body/bullets — must reference specific concepts from that slide's title/body; no text in image",
      "titleFontStyle": "inter",
      "bodyFontStyle": "inter",
      "titleFontSize": 34,
      "bodyFontSize": 20,
      "titleColor": "#111111",
      "bodyColor": "#374151",
      "titleAlign": "left | center"
    }
  ]
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.75,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a modern presentation designer for Ontario dermatology clinics. Create visually varied decks with substantive copy. Inline illustration vectors must match each slide's specific content via imagePrompt. AI backdrops (backgroundStyle ai) are full-slide backgrounds separate from inline images. Do not suggest hex background colours. Use Canadian spelling. When existing slide images are attached, build on those visuals. Return valid JSON only.",
        },
        {
          role: "user",
          content: buildVisionUserContent(userPrompt, options.contextImages),
        },
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
    deckTitle?: unknown;
    slides?: Array<Record<string, unknown>>;
  };

  const slides = (parsed.slides ?? []).map((slide) =>
    normalizeGeneratedSlide({
      title: normalizeSlideField(slide.title) || "Untitled",
      body: normalizeSlideField(slide.body) || undefined,
      leftBody: normalizeSlideField(slide.leftBody) || undefined,
      rightBody: normalizeSlideField(slide.rightBody) || undefined,
      notes: normalizeSlideField(slide.notes) || undefined,
      layout: typeof slide.layout === "string" ? slide.layout : undefined,
      backgroundStyle:
        slide.backgroundStyle === "white" ||
        slide.backgroundStyle === "solid" ||
        slide.backgroundStyle === "ai"
          ? slide.backgroundStyle
          : undefined,
      background: typeof slide.background === "string" ? slide.background : undefined,
      backgroundImagePrompt:
        typeof slide.backgroundImagePrompt === "string" ? slide.backgroundImagePrompt : undefined,
      imagePrompt: typeof slide.imagePrompt === "string" ? slide.imagePrompt : undefined,
      titleFontStyle: typeof slide.titleFontStyle === "string" ? slide.titleFontStyle : undefined,
      bodyFontStyle: typeof slide.bodyFontStyle === "string" ? slide.bodyFontStyle : undefined,
      titleFontSize: typeof slide.titleFontSize === "number" ? slide.titleFontSize : undefined,
      bodyFontSize: typeof slide.bodyFontSize === "number" ? slide.bodyFontSize : undefined,
      titleColor: typeof slide.titleColor === "string" ? slide.titleColor : undefined,
      bodyColor: typeof slide.bodyColor === "string" ? slide.bodyColor : undefined,
      titleAlign:
        slide.titleAlign === "left" || slide.titleAlign === "center" || slide.titleAlign === "right"
          ? slide.titleAlign
          : undefined,
    } as Partial<GeneratedDeckSlide>),
  );

  if (slides.length === 0) {
    throw new Error("No slides returned from AI.");
  }

  return {
    deckTitle: normalizeSlideField(parsed.deckTitle) || options.prompt.trim(),
    slides,
  };
}
