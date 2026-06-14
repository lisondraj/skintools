import type { InfographicContent } from "./types";

const TYPE_LABELS: Record<string, string> = {
  info: "INFO",
  tip: "TIP",
  warning: "WARNING",
  note: "NOTE",
};

/** Flatten structured content into a text block for image-generation prompts. */
export function flattenContent(
  content: InfographicContent,
  language: string,
): string {
  const facts = content.keyFacts
    .map((f, i) => `  Stat ${i + 1}: ${f}`)
    .join("\n");

  const sections = content.sections
    .map(
      (s, i) => {
        const tag = TYPE_LABELS[s.type] ?? s.type.toUpperCase();
        return `  [${tag}] Section ${i + 1}: ${s.heading}\n    ${s.body}`;
      },
    )
    .join("\n\n");

  const warning = content.warning
    ? `\n⚠ SAFETY WARNING: ${content.warning}`
    : "";

  return `Language: ${language}

TITLE: ${content.title}
SUBTITLE: ${content.subtitle}

KEY FACTS / STATS (render as stat boxes or badges):
${facts}

SECTIONS (render each with its type tag):
${sections}
${warning}

FOOTER: ${content.footer}`;
}
