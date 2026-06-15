/** Shared copy rules for AI slide and deck generation. */
export const SLIDE_CONTENT_STYLE_GUIDE = `
Content depth & variety (critical):
- Do NOT use the repetitive "**Label:** short sentence" pattern on every bullet.
- Do NOT stop at 3 bullets. Content slides need substance: typically 5–9 bullet lines, OR a mix of paragraphs, ## subheadings, and bullets.
- Write flowing bullet text (e.g. "• UV exposure accumulates over decades and remains the main modifiable risk factor for melanoma") — not telegraphic label-colon fragments.
- Use **bold** sparingly for key terms inside sentences, not as a prefix label on every line.

Organize body text in varied ways — pick what fits the topic:
- Sectioned: ## Subheading, then 3–5 bullets; blank line; another ## section
- Narrative lead-in: 1–2 full sentences, then 4–6 supporting bullets
- Dense teaching: # Key concept line, paragraph, then nested sub-bullets (indent sub-points with 2 spaces before •)
- Comparison: two-column layout with 4–6 parallel bullets per column
- Image slides: shorter text (4–5 bullets) beside the illustration; put detail in speaker notes

Include specific clinical facts, examples, patient counselling points, and actionable guidance — not superficial summaries.
Use Canadian spelling. Blank lines between sections.`;

export const SLIDE_LAYOUT_PICK_GUIDE = `
Pick the best layout for this slide's content:
- "title-body" — narrative or mixed paragraph + bullets; optional imagePrompt adds a small accent illustration vector on the slide
- "bullets" — list-heavy with ## section breaks; optional imagePrompt for a supporting accent illustration
- "two-column" — compare/contrast (leftBody + rightBody, 4–6 items each)
- "image-right" or "image-left" — primary illustration beside text (REQUIRED imagePrompt — becomes a canvas image vector)
- "title" — only for opening/closing title slides
- "image-hero" — dramatic opener with backgroundImagePrompt (background only, not a canvas vector)`;

export const SLIDE_INLINE_IMAGE_GUIDE = `
Inline illustration vectors (canvas image elements — separate from pale AI backgrounds):
- Use layout "image-right" or "image-left" when a clinical illustration is central to the slide. Always include a detailed imagePrompt.
- On "title-body" or "bullets" slides, you MAY add an optional imagePrompt for a smaller accent illustration when it clarifies the topic.
- Do NOT combine backgroundStyle "ai" with an imagePrompt on the same slide — pick one visual approach.
- imagePrompt must describe a clean clinical illustration with NO text, NO labels, NO annotations, NO watermarks in the image.`;
