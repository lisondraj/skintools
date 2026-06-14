import type { InfographicContent } from "./types";

/** Flatten structured content into a text block for image-generation prompts. */
export function flattenContent(
  content: InfographicContent,
  language: string,
): string {
  const facts = content.keyFacts
    .map((f, i) => `  ${i + 1}. ${f}`)
    .join("\n");

  const sections = content.sections
    .map(
      (s, i) =>
        `  Section ${i + 1} [${s.type}]: ${s.heading}\n    ${s.body}`,
    )
    .join("\n");

  const warning = content.warning
    ? `\nWarning: ${content.warning}`
    : "";

  return `Language: ${language}

Title: ${content.title}
Subtitle: ${content.subtitle}

Key facts:
${facts}

Sections:
${sections}
${warning}

Footer: ${content.footer}`;
}
