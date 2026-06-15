import type { GeneratedDeckSlide } from "./types";

const MAX_CONTEXT_CHARS = 420;

function summarizeSlideContent(slide: GeneratedDeckSlide): string {
  const chunks: string[] = [];
  if (slide.title?.trim()) chunks.push(slide.title.trim());
  if (slide.body?.trim()) chunks.push(slide.body.trim());
  if (slide.leftBody?.trim()) chunks.push(slide.leftBody.trim());
  if (slide.rightBody?.trim()) chunks.push(slide.rightBody.trim());

  const combined = chunks
    .join(" ")
    .replace(/\*\*/g, "")
    .replace(/#{1,2}\s/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (combined.length <= MAX_CONTEXT_CHARS) return combined;
  return `${combined.slice(0, MAX_CONTEXT_CHARS).trim()}…`;
}

/** Unused — AI backgrounds are disabled. Kept as stub to avoid import errors. */
export function buildContextualBackgroundPrompt(_slide: GeneratedDeckSlide): string {
  return "";
}

/** Inline illustration prompt enriched with slide text context. */
export function buildContextualInlineImagePrompt(slide: GeneratedDeckSlide): string {
  const summary = summarizeSlideContent(slide);
  const subject = slide.imagePrompt?.trim() || `Clinical illustration for "${slide.title}"`;

  return [
    subject,
    `Topic context: ${summary}.`,
    "Clean, professional medical education illustration style.",
    "White or very light background. No text, no labels, no watermarks, no captions, no UI elements.",
    "Suitable for a dermatology presentation slide — portrait orientation.",
  ].join(" ");
}

// AI backgrounds are disabled — always use solid colours from deck-builder.
export function shouldGenerateAiBackground(_slide: GeneratedDeckSlide): boolean {
  return false;
}

export function shouldGenerateInlineImage(slide: GeneratedDeckSlide): boolean {
  return slide.layout === "image-right" || slide.layout === "image-left";
}
