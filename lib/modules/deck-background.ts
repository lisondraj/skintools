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

/** GPT Image 2 prompt for a full-slide background tied to slide copy. */
export function buildContextualBackgroundPrompt(slide: GeneratedDeckSlide): string {
  const summary = summarizeSlideContent(slide);
  const custom = slide.backgroundImagePrompt?.trim();

  const theme = custom
    ? custom
    : `Visual theme related to: ${summary}`;

  return [
    `Dermatology presentation slide background for "${slide.title}".`,
    `Slide topic and content: ${summary}.`,
    theme,
    "16:9 widescreen, professional medical aesthetic, soft gradients or abstract clinical imagery.",
    "Subtle and light enough for dark or light text overlay — avoid busy patterns in the center.",
    "No text, no labels, no watermarks, no logos.",
  ].join(" ");
}

/** Inline illustration prompt enriched with slide text context. */
export function buildContextualInlineImagePrompt(slide: GeneratedDeckSlide): string {
  const summary = summarizeSlideContent(slide);
  const subject = slide.imagePrompt?.trim() || `Illustration supporting "${slide.title}"`;

  return [
    subject,
    `Must align with slide content: ${summary}.`,
    "Clean clinical dermatology educational style for a presentation slide.",
  ].join(" ");
}

export function shouldGenerateAiBackground(slide: GeneratedDeckSlide): boolean {
  if (slide.backgroundStyle === "ai") return true;
  if (slide.layout === "image-hero") return true;
  return false;
}

export function shouldGenerateInlineImage(slide: GeneratedDeckSlide): boolean {
  return slide.layout === "image-right" || slide.layout === "image-left";
}
