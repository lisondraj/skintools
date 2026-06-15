import type { GeneratedDeckSlide } from "./types";

const MAX_INLINE_CONTEXT_CHARS = 520;
const MAX_BG_CONTEXT_CHARS = 360;

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/#{1,2}\s/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rich summary of slide copy for image generation prompts. */
function summarizeSlideContent(slide: GeneratedDeckSlide, maxChars: number): string {
  const chunks: string[] = [];
  if (slide.title?.trim()) chunks.push(`Title: ${slide.title.trim()}`);
  if (slide.body?.trim()) chunks.push(`Body: ${stripMarkdown(slide.body)}`);
  if (slide.leftBody?.trim()) chunks.push(`Left: ${stripMarkdown(slide.leftBody)}`);
  if (slide.rightBody?.trim()) chunks.push(`Right: ${stripMarkdown(slide.rightBody)}`);

  const combined = chunks.join(" | ");
  if (combined.length <= maxChars) return combined;
  return `${combined.slice(0, maxChars).trim()}…`;
}

/** GPT Image 2 prompt for a full-slide background tied to slide copy. */
export function buildContextualBackgroundPrompt(slide: GeneratedDeckSlide): string {
  const summary = summarizeSlideContent(slide, MAX_BG_CONTEXT_CHARS);
  const custom = slide.backgroundImagePrompt?.trim();
  const themeHint = custom || `modern visual theme inspired by the slide content`;

  return [
    `Modern full-slide background for a dermatology presentation.`,
    `Slide content: ${summary}.`,
    `Visual direction: ${themeHint}.`,
    `Style: contemporary, clean, editorial — subtle abstract shapes, soft gradients, or refined clinical motifs.`,
    `Keep the centre relatively open so dark slide text remains readable.`,
    `No people, no faces, no stock photography, no text, no labels, no watermarks, no logos.`,
    `Wide 16:9 composition.`,
  ].join(" ");
}

/** Inline illustration prompt enriched with slide title and body so the image matches the copy. */
export function buildContextualInlineImagePrompt(slide: GeneratedDeckSlide): string {
  const summary = summarizeSlideContent(slide, MAX_INLINE_CONTEXT_CHARS);
  const subject = slide.imagePrompt?.trim() || `Clinical illustration for "${slide.title}"`;

  return [
    `Create an illustration that directly supports this presentation slide.`,
    `Slide content: ${summary}.`,
    `Illustration brief: ${subject}.`,
    `The image MUST depict the same condition, anatomy, procedure, or counselling point described in the slide text — not a generic dermatology stock image.`,
    `Modern, clean medical-education illustration style.`,
    `Neutral or transparent background behind the subject.`,
    `Absolutely no text, no labels, no captions, no watermarks, no UI elements, no annotations in the image.`,
    `Portrait orientation, suitable for a presentation slide panel.`,
  ].join(" ");
}

export function shouldGenerateAiBackground(slide: GeneratedDeckSlide): boolean {
  return slide.backgroundStyle === "ai";
}

export function shouldGenerateInlineImage(slide: GeneratedDeckSlide): boolean {
  return (
    slide.layout === "image-right" ||
    slide.layout === "image-left" ||
    Boolean(slide.imagePrompt?.trim())
  );
}
