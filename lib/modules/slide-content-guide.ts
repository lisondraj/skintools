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

export const SLIDE_BACKGROUND_GUIDE = `
Slide backdrop (modern, clean — no preset colours):
- backgroundStyle "solid" — a single flat backdrop. Do NOT specify hex colours; the app applies a neutral default.
- backgroundStyle "ai" — GPT Image 2 generates a full-slide background. Provide backgroundImagePrompt: a brief modern visual theme tied to THIS slide's title and body (abstract, editorial, or subtle clinical motif — not stock-photo busy).
- Prefer "ai" on title slides and 2–4 key content slides for a polished deck. Use "solid" on dense text slides.
- backgroundStyle "ai" and imagePrompt CAN be used together on the same slide — the backdrop is full-bleed; the inline vector sits on top as a canvas element.
- Design for dark text (#111111) remaining readable — avoid extremely dark or cluttered centre areas.`;

export const SLIDE_INLINE_IMAGE_GUIDE = `
Inline illustration vectors (canvas image elements — layered above slide backdrops):
- Use layout "image-right" or "image-left" when a clinical illustration is central to the slide. Always include imagePrompt.
- Inline vectors work alongside backgroundStyle "ai" — use both when a polished backdrop plus a focal illustration strengthens the slide.
- On "title-body" or "bullets" slides, you MAY add an optional imagePrompt for a smaller accent illustration.
- imagePrompt is critical: describe WHAT to illustrate using 2–4 specific terms pulled from the slide title and body you wrote (e.g. if the slide discusses UV filters and SPF, the imagePrompt should mention broad-spectrum sunscreen application — not generic "dermatology image").
- The illustration must visually support the exact slide copy — same condition, anatomy, or counselling point.
- No text, labels, annotations, or watermarks inside the generated image.`;
