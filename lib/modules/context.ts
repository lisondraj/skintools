import type { Deck, Slide, SlideElement } from "./types";

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

export function buildSlideAIContext(options: {
  deck: Deck;
  slideIndex: number;
  selectedElementId?: string | null;
}): string {
  const { deck, slideIndex, selectedElementId } = options;
  const slide = deck.slides[slideIndex];
  if (!slide) return "";

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

  if (slide.elements.some((el) => el.kind === "image")) {
    lines.push(`Images on slide: ${slide.elements.filter((el) => el.kind === "image").length}`);
  }

  if (slide.notes?.trim()) {
    lines.push(`Speaker notes: ${slide.notes.trim()}`);
  }

  return lines.join("\n");
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
