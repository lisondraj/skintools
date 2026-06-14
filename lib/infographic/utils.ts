import type { InfographicContent } from "./types";

/** Flatten structured content into a text block for image-generation prompts. */
export function flattenContent(
  content: InfographicContent,
  language: string,
): string {
  const facts = content.keyFacts.map((f) => `• ${f}`).join("\n");

  const sections = content.sections
    .map((s) => {
      const bulletLines = s.bullets.map((b) => `  • ${b}`).join("\n");
      return `${s.heading}\n${bulletLines}`;
    })
    .join("\n\n");

  const warning = content.warning ? `\nWarning: ${content.warning}` : "";

  return `Language: ${language}

Title: ${content.title}
Subtitle: ${content.subtitle}

Key facts:
${facts}

${sections}
${warning}

Footer: ${content.footer}`;
}
