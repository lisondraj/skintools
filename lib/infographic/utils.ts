/**
 * Split text into wrapped lines based on a max-character-per-line budget.
 * Uses simple word-boundary splitting (not pixel-accurate, but consistent
 * with the SVG templates that use the same budget).
 */
export function wrapText(text: string, maxChars: number): string[] {
  const trimmed = text?.trim();
  if (!trimmed) return [""];
  const words = trimmed.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // If a single word is longer than maxChars, force-push it
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
