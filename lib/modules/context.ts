import type { Deck, ImageElement, Slide, SlideElement } from "./types";
import type { SlideContextImage } from "./types";
import { isSlideBackgroundImage } from "./background";

export type SlideAIContext = {
  text: string;
  images: SlideContextImage[];
};

const MAX_CONTEXT_IMAGES = 8;

function isSendableImageUrl(url: string): boolean {
  const value = url.trim();
  return (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

function slideTextSummary(slide: Slide, maxLen = 280): string {
  const chunks = slide.elements
    .filter((el): el is SlideElement & { kind: "text" } => el.kind === "text")
    .sort((a, b) => a.z - b.z)
    .map((el) => el.text.trim())
    .filter(Boolean);

  if (chunks.length === 0) return "(empty slide)";
  const joined = chunks.join(" | ");
  return joined.length > maxLen ? `${joined.slice(0, maxLen)}…` : joined;
}

function imagesFromSlide(
  slide: Slide,
  label: string,
  selectedElementId?: string | null,
): SlideContextImage[] {
  if (slide.kind !== "content") return [];

  const images: SlideContextImage[] = [];

  if (isSlideBackgroundImage(slide.background) && isSendableImageUrl(slide.background)) {
    images.push({ label: `${label} · background`, url: slide.background });
  }

  slide.elements
    .filter((el): el is ImageElement => el.kind === "image")
    .sort((a, b) => a.z - b.z)
    .forEach((el, i) => {
      if (!isSendableImageUrl(el.src)) return;
      const marker = el.id === selectedElementId ? " [SELECTED]" : "";
      images.push({ label: `${label} · image ${i + 1}${marker}`, url: el.src });
    });

  return images;
}

function mergeContextImages(...groups: SlideContextImage[][]): SlideContextImage[] {
  const seen = new Set<string>();
  const merged: SlideContextImage[] = [];

  for (const group of groups) {
    for (const image of group) {
      if (seen.has(image.url)) continue;
      seen.add(image.url);
      merged.push(image);
      if (merged.length >= MAX_CONTEXT_IMAGES) return merged;
    }
  }

  return merged;
}

function countSlideImages(slide: Slide): number {
  if (slide.kind !== "content") return 0;
  let count = slide.elements.filter((el) => el.kind === "image").length;
  if (isSlideBackgroundImage(slide.background)) count += 1;
  return count;
}

export function buildSlideAIContext(options: {
  deck: Deck;
  slideIndex: number;
  selectedElementId?: string | null;
}): SlideAIContext {
  const { deck, slideIndex, selectedElementId } = options;
  const slide = deck.slides[slideIndex];
  if (!slide) return { text: "", images: [] };

  const lines: string[] = [
    `Presentation title: "${deck.title}"`,
    `Current slide: ${slideIndex + 1} of ${deck.slides.length}`,
    `Slide type: ${slide.kind === "patient-sim" ? "virtual patient simulation" : "content"}`,
  ];

  if (slideIndex > 0) {
    lines.push(`Previous slide (${slideIndex}): ${slideTextSummary(deck.slides[slideIndex - 1], 180)}`);
  }
  if (slideIndex < deck.slides.length - 1) {
    lines.push(`Next slide (${slideIndex + 2}): ${slideTextSummary(deck.slides[slideIndex + 1], 180)}`);
  }

  const textEls = slide.elements
    .filter((el): el is SlideElement & { kind: "text" } => el.kind === "text")
    .sort((a, b) => a.z - b.z);

  if (textEls.length > 0) {
    lines.push("All text on this slide:");
    textEls.forEach((el, i) => {
      const marker = el.id === selectedElementId ? " [SELECTED]" : "";
      lines.push(`  ${i + 1}.${marker} ${el.text.trim() || "(empty)"}`);
    });
  } else {
    lines.push("All text on this slide: (none)");
  }

  const imageCount = countSlideImages(slide);
  if (imageCount > 0) {
    lines.push(`Images on this slide: ${imageCount}`);
  }

  if (slide.notes?.trim()) {
    lines.push(`Speaker notes: ${slide.notes.trim()}`);
  }

  const images = mergeContextImages(
    imagesFromSlide(slide, `Slide ${slideIndex + 1} (current)`, selectedElementId),
    slideIndex > 0 ? imagesFromSlide(deck.slides[slideIndex - 1], `Slide ${slideIndex}`) : [],
    slideIndex < deck.slides.length - 1
      ? imagesFromSlide(deck.slides[slideIndex + 1], `Slide ${slideIndex + 2}`)
      : [],
  );

  if (images.length > 0) {
    lines.push(
      `${images.length} slide image(s) are attached below — describe and align copy with what is shown.`,
    );
  }

  return { text: lines.join("\n"), images };
}

/** Full-deck context for AI deck generation (text summaries + images from all slides). */
export function buildDeckAIContext(deck: Deck): SlideAIContext {
  const lines: string[] = [
    `Presentation title: "${deck.title}"`,
    `Existing deck: ${deck.slides.length} slide(s)`,
  ];

  deck.slides.forEach((slide, index) => {
    if (slide.kind === "patient-sim") {
      lines.push(`Slide ${index + 1}: virtual patient simulation`);
      return;
    }
    lines.push(`Slide ${index + 1}: ${slideTextSummary(slide, 200)}`);
    if (countSlideImages(slide) > 0) {
      lines.push(`  (${countSlideImages(slide)} image(s) on this slide)`);
    }
    if (slide.notes?.trim()) {
      lines.push(`  Notes: ${slide.notes.trim().slice(0, 120)}${slide.notes.length > 120 ? "…" : ""}`);
    }
  });

  const images = mergeContextImages(
    ...deck.slides.map((slide, index) => imagesFromSlide(slide, `Slide ${index + 1}`)),
  );

  if (images.length > 0) {
    lines.push(
      `${images.length} slide image(s) from this deck are attached — incorporate or reference existing visuals where relevant.`,
    );
  }

  return { text: lines.join("\n"), images };
}

export function mergeTextSelection(
  fullText: string,
  start: number,
  end: number,
  replacement: string,
): string {
  const safeStart = Math.max(0, Math.min(start, fullText.length));
  const safeEnd = Math.max(safeStart, Math.min(end, fullText.length));
  return fullText.slice(0, safeStart) + replacement + fullText.slice(safeEnd);
}
