import type { GeneratedDeckSlide } from "./types";

const MAX_CONTEXT_CHARS = 300;

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

/**
 * GPT Image 2 prompt for a full-slide background.
 *
 * Key requirements:
 * - Very light / pale — dark text (#111) must remain legible over it
 * - Abstract / non-representational — no people, no faces, no stock photos
 * - Subtle enough to read text in front of; not the visual focus
 * - Thematically consistent with the slide topic
 */
export function buildContextualBackgroundPrompt(slide: GeneratedDeckSlide): string {
  const summary = summarizeSlideContent(slide);
  const custom = slide.backgroundImagePrompt?.trim();

  const themeHint = custom
    ? custom
    : `abstract motifs inspired by: ${summary}`;

  return [
    `Very light, pale, almost-white abstract background for a medical presentation slide.`,
    `Theme: ${themeHint}.`,
    `Style: soft watercolor wash or subtle geometric pattern, muted pastel tones (whites, light blues, light greens, or warm creams).`,
    `Must be predominantly light/pale so that black or very dark text is highly legible on top.`,
    `Abstract and non-representational — absolutely no people, no faces, no recognisable medical equipment, no stock photography, no text, no labels, no watermarks, no logos.`,
    `Wide 16:9 composition. Edges may carry gentle colour; the centre should remain clean and uncluttered to leave room for slide text.`,
    `Professional, refined, tasteful. Think subtle paper texture or soft gradient bleed, not a busy illustration.`,
  ].join(" ");
}

/** Inline illustration prompt enriched with slide text context. */
export function buildContextualInlineImagePrompt(slide: GeneratedDeckSlide): string {
  const summary = summarizeSlideContent(slide);
  const subject = slide.imagePrompt?.trim() || `Clinical illustration for "${slide.title}"`;

  return [
    subject,
    `Topic context: ${summary}.`,
    `Style: clean, professional medical-education illustration.`,
    `White or very light neutral background — no gradients or textures behind the subject.`,
    `Absolutely no text, no labels, no captions, no watermarks, no UI elements, no annotations in the image.`,
    `Portrait orientation, suitable for a presentation slide panel.`,
  ].join(" ");
}

export function shouldGenerateAiBackground(slide: GeneratedDeckSlide): boolean {
  return slide.backgroundStyle === "ai";
}

export function shouldGenerateInlineImage(slide: GeneratedDeckSlide): boolean {
  return slide.layout === "image-right" || slide.layout === "image-left";
}
