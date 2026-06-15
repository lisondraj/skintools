import { createEmptySlide } from "./storage";
import { createImageElement, createTextElement } from "./elements";
import type {
  GeneratedDeckSlide,
  GeneratedSlideBackgroundStyle,
  GeneratedSlideLayout,
  Slide,
  TextAlign,
} from "./types";
import { MODULES_STAGE_H, MODULES_STAGE_W } from "./types";

/* ── Constants ─────────────────────────────────────────────────── */

// Slide margins
const PAD_H = 72;   // horizontal padding (left + right)
const PAD_V = 40;   // vertical padding (top + bottom)
const BODY_W = MODULES_STAGE_W - PAD_H * 2;
const STAGE_H = MODULES_STAGE_H;

// Inter is always used — font choice is not delegated to the AI.
const FONT = "inter";

const VALID_LAYOUTS: GeneratedSlideLayout[] = [
  "title",
  "title-body",
  "bullets",
  "two-column",
  "image-right",
  "image-left",
  "image-hero",
];

/* ── Normalizers ────────────────────────────────────────────────── */

function normalizeLayout(value: unknown): GeneratedSlideLayout {
  if (typeof value === "string" && VALID_LAYOUTS.includes(value as GeneratedSlideLayout)) {
    return value as GeneratedSlideLayout;
  }
  return "title-body";
}

function normalizeFontSize(value: unknown, fallback: number): number {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 12 && n <= 72) return Math.round(n);
  return fallback;
}

function normalizeAlign(value: unknown, fallback: TextAlign = "left"): TextAlign {
  if (value === "center" || value === "right" || value === "left") return value;
  return fallback;
}

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.trim())) {
    return value.trim();
  }
  return fallback;
}

function normalizeBackgroundStyle(value: unknown): GeneratedSlideBackgroundStyle {
  if (value === "ai") return "ai";
  // "white" and unknown values → solid (no white backdrop rule in prompts).
  return "solid";
}

export function normalizeGeneratedSlide(raw: Partial<GeneratedDeckSlide>): GeneratedDeckSlide {
  const layout = normalizeLayout(raw.layout);
  const backgroundStyle = normalizeBackgroundStyle(raw.backgroundStyle);

  return {
    title: String(raw.title ?? "Untitled").trim() || "Untitled",
    body: raw.body != null ? String(raw.body).trim() : undefined,
    leftBody: raw.leftBody != null ? String(raw.leftBody).trim() : undefined,
    rightBody: raw.rightBody != null ? String(raw.rightBody).trim() : undefined,
    notes: raw.notes != null ? String(raw.notes).trim() : undefined,
    layout,
    backgroundStyle,
    // Ignore AI-suggested hex — app uses a neutral default for solid slides.
    background: "#f4f4f5",
    backgroundImagePrompt:
      typeof raw.backgroundImagePrompt === "string" ? raw.backgroundImagePrompt.trim() : undefined,
    imagePrompt: typeof raw.imagePrompt === "string" ? raw.imagePrompt.trim() : undefined,
    // Lock ALL fonts to Inter.
    titleFontStyle: FONT,
    bodyFontStyle: FONT,
    titleFontSize: normalizeFontSize(
      raw.titleFontSize,
      layout === "title" ? 52 : layout === "bullets" ? 30 : 34,
    ),
    bodyFontSize: normalizeFontSize(
      raw.bodyFontSize,
      layout === "title" ? 22 : layout === "two-column" ? 18 : 20,
    ),
    // Always use black text — AI backgrounds are generated as very light/pale
    // so dark text is always legible.
    titleColor: "#111111",
    bodyColor: "#374151",
    titleAlign: normalizeAlign(raw.titleAlign, layout === "title" ? "center" : "left"),
  };
}

/* ── A resolved spec with guaranteed font sizes ─────────────────── */

type ResolvedSpec = GeneratedDeckSlide & {
  tfs: number; // resolved titleFontSize
  bfs: number; // resolved bodyFontSize
};

function resolveSpec(spec: GeneratedDeckSlide): ResolvedSpec {
  const layout = spec.layout;
  return {
    ...spec,
    tfs: normalizeFontSize(spec.titleFontSize, layout === "title" ? 52 : layout === "bullets" ? 30 : 34),
    bfs: normalizeFontSize(spec.bodyFontSize, layout === "title" ? 22 : layout === "two-column" ? 18 : 20),
  };
}

/* ── Height estimation (mirrors RichTextContent layout) ─────────── */

type ParsedLine = {
  content: string;
  fontScale: number;
  indent: number;
  bullet: boolean;
};

function parseLineForEstimate(line: string): ParsedLine {
  const indentMatch = line.match(/^(\s*)/);
  const indent = Math.floor((indentMatch?.[1]?.length ?? 0) / 2);
  let trimmed = line.trimStart();

  let fontScale = 1;
  if (trimmed.startsWith("# ")) {
    fontScale = 1.45;
    trimmed = trimmed.slice(2);
  } else if (trimmed.startsWith("## ")) {
    fontScale = 1.2;
    trimmed = trimmed.slice(3);
  }

  let bullet = false;
  if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
    bullet = true;
    trimmed = trimmed.slice(2);
  }

  // Strip inline markdown markers for width estimation (bold adds ~10% width).
  const content = trimmed.replace(/\*\*/g, "").replace(/__/g, "").replace(/\*/g, "").replace(/_/g, "");
  return { content, fontScale, indent, bullet };
}

function effectiveLineWidth(boxW: number, indent: number, bullet: boolean): number {
  const boxPadding = 16; // modules-el__text 8px each side
  const bulletPad = bullet ? 14 : 0;
  const indentPad = indent * 18;
  return Math.max(48, boxW - boxPadding - bulletPad - indentPad);
}

/** Conservative chars-per-line for Inter at a given size. */
function charsPerLine(effectiveW: number, fontSize: number, fontScale: number): number {
  const charWidth = fontSize * fontScale * 0.56;
  return Math.max(6, Math.floor(effectiveW / charWidth));
}

function lineBlockHeight(fontSize: number, fontScale: number, wrappedLines: number): number {
  const lineH = fontSize * fontScale * 1.35;
  return wrappedLines * (lineH + 2); // +2 matches modules-rich-text__line margin-bottom
}

/**
 * Estimate pixel height for rich text inside a box.
 * Uses conservative wrapping + 18% safety buffer to avoid clipping.
 */
function estimateRichTextHeight(text: string, boxW: number, fontSize: number): number {
  if (!text.trim()) return Math.round(fontSize * 1.5) + 16;

  let total = 16; // internal padding allowance
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      total += fontSize * 0.5; // modules-rich-text__spacer
      continue;
    }

    const { content, fontScale, indent, bullet } = parseLineForEstimate(line);
    const effW = effectiveLineWidth(boxW, indent, bullet);
    const cpl = charsPerLine(effW, fontSize, fontScale);
    const wrapped = Math.max(1, Math.ceil(content.length / cpl));
    total += lineBlockHeight(fontSize, fontScale, wrapped);
  }

  return Math.ceil(total * 1.18);
}

/** Legacy alias used by title sizing. */
function estimateTextHeight(text: string, boxW: number, fontSize: number): number {
  return estimateRichTextHeight(text, boxW, fontSize);
}

/** Clamp a box so it doesn't overflow the stage vertically. */
function clampH(y: number, h: number, bottomPad = PAD_V): number {
  return Math.min(h, STAGE_H - y - bottomPad);
}

/** Split body text into chunks that each fit within maxChunkH. */
function splitBodyIntoChunks(text: string, boxW: number, fontSize: number, maxChunkH: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [""];
  if (estimateRichTextHeight(trimmed, boxW, fontSize) <= maxChunkH) return [trimmed];

  // Prefer splitting at ## section headings or blank-line paragraph breaks.
  const parts = trimmed.split(/(?=\n## )|\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    // Fall back: split by single lines, packing greedily.
    const lineParts = trimmed.split("\n");
    const chunks: string[] = [];
    let current = "";
    for (const line of lineParts) {
      const candidate = current ? `${current}\n${line}` : line;
      if (estimateRichTextHeight(candidate, boxW, fontSize) <= maxChunkH) {
        current = candidate;
      } else {
        if (current) chunks.push(current);
        current = line;
      }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [trimmed];
  }

  const chunks: string[] = [];
  let current = "";
  for (const part of parts) {
    const candidate = current ? `${current}\n\n${part}` : part;
    if (estimateRichTextHeight(candidate, boxW, fontSize) <= maxChunkH) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      if (estimateRichTextHeight(part, boxW, fontSize) <= maxChunkH) {
        current = part;
      } else {
        chunks.push(...splitBodyIntoChunks(part, boxW, fontSize, maxChunkH));
        current = "";
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [trimmed];
}

const BODY_BOX_GAP = 8;

/** Build one or more stacked body text elements that fit on the slide. */
function buildStackedTextElements(
  text: string,
  x: number,
  startY: number,
  textW: number,
  fontSize: number,
  color: string,
  zStart: number,
  bottomPad = PAD_V,
): TextEl[] {
  const bottom = STAGE_H - bottomPad;
  const maxTotalH = bottom - startY;
  if (maxTotalH < 40 || !text.trim()) return [];

  const totalEst = estimateRichTextHeight(text, textW, fontSize);
  if (totalEst <= maxTotalH) {
    return [
      textEl(text, zStart, {
        x,
        y: startY,
        w: textW,
        h: totalEst,
        fontSize,
        fontWeight: 400,
        fontStyle: FONT,
        color,
        align: "left",
      }),
    ];
  }

  const chunks = splitBodyIntoChunks(text, textW, fontSize, maxTotalH);
  const elements: TextEl[] = [];
  let y = startY;
  let z = zStart;

  for (const chunk of chunks) {
    const avail = bottom - y;
    if (avail < 36) break;
    const h = Math.min(estimateRichTextHeight(chunk, textW, fontSize), avail);
    elements.push(
      textEl(chunk, z++, {
        x,
        y,
        w: textW,
        h,
        fontSize,
        fontWeight: 400,
        fontStyle: FONT,
        color,
        align: "left",
      }),
    );
    y += h + BODY_BOX_GAP;
  }

  return elements;
}

/* ── Slide builders ────────────────────────────────────────────── */

type TextEl = ReturnType<typeof createTextElement>;

function textEl(text: string, z: number, opts: Partial<Parameters<typeof createTextElement>[2]>) {
  return createTextElement(text, z, opts);
}

// ── title: large centered title + optional short subtitle ───────
function buildTitleSlide(s: ResolvedSpec): TextEl[] {
  const titleH = clampH(150, estimateTextHeight(s.title, BODY_W, s.tfs) + 16, 20);
  const elements: TextEl[] = [
    textEl(s.title, 1, {
      x: PAD_H,
      y: 150,
      w: BODY_W,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: "center",
    }),
  ];

  if (s.body?.trim()) {
    const subY = 150 + titleH + 16;
    const subH = clampH(subY, estimateTextHeight(s.body, BODY_W, s.bfs), 24);
    elements.push(
      textEl(s.body, 2, {
        x: PAD_H,
        y: subY,
        w: BODY_W,
        h: subH,
        fontSize: s.bfs,
        fontWeight: 400,
        fontStyle: FONT,
        color: s.bodyColor ?? "#374151",
        align: "center",
      }),
    );
  }
  return elements;
}

// Accent illustration on text-heavy layouts (smaller than image-right panel).
const ACCENT_IMG = { x: 620, y: 100, w: 300, h: 360 };
const TEXT_W_WITH_ACCENT = 520;

function addAccentImage(elements: Slide["elements"], imageSrc: string): Slide["elements"] {
  return [
    createImageElement(imageSrc, 1, ACCENT_IMG),
    ...elements,
  ];
}

// ── title-body: title + body paragraph/bullets ──────────────────
function buildTitleBodySlide(s: ResolvedSpec, imageSrc?: string): Slide["elements"] {
  const hasAccent = Boolean(imageSrc);
  const textW = hasAccent ? TEXT_W_WITH_ACCENT : BODY_W;
  const titleY = PAD_V;
  const titleH = clampH(titleY, estimateTextHeight(s.title, textW, s.tfs) + 8, 20);
  const bodyY = titleY + titleH + 20;

  const elements: Slide["elements"] = [
    textEl(s.title, 2, {
      x: PAD_H,
      y: titleY,
      w: textW,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: s.titleAlign,
    }),
    ...buildStackedTextElements(s.body ?? "", PAD_H, bodyY, textW, s.bfs, s.bodyColor ?? "#374151", 3),
  ];

  if (imageSrc) return addAccentImage(elements, imageSrc);
  return elements;
}

// ── bullets: title + section-break bullets ──────────────────────
function buildBulletsSlide(s: ResolvedSpec, imageSrc?: string): Slide["elements"] {
  const hasAccent = Boolean(imageSrc);
  const textW = hasAccent ? TEXT_W_WITH_ACCENT : BODY_W;
  const titleY = PAD_V - 4;
  const titleH = clampH(titleY, estimateTextHeight(s.title, textW, s.tfs) + 8, 16);
  const bodyY = titleY + titleH + 18;

  const elements: Slide["elements"] = [
    textEl(s.title, 2, {
      x: PAD_H,
      y: titleY,
      w: textW,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: s.titleAlign,
    }),
    ...buildStackedTextElements(s.body ?? "", PAD_H, bodyY, textW, s.bfs, s.bodyColor ?? "#374151", 3),
  ];

  if (imageSrc) return addAccentImage(elements, imageSrc);
  return elements;
}

// ── two-column: title + left column + right column ──────────────
function buildTwoColumnSlide(s: ResolvedSpec): TextEl[] {
  const colPad = 56;
  const gutter = 20;
  const colW = Math.floor((MODULES_STAGE_W - colPad * 2 - gutter) / 2);
  const titleH = clampH(32, estimateTextHeight(s.title, MODULES_STAGE_W - colPad * 2, s.tfs) + 8, 16);
  const bodyY = 32 + titleH + 18;
  const leftText = s.leftBody ?? s.body ?? "";
  const rightText = s.rightBody ?? "";

  const leftElements = buildStackedTextElements(leftText, colPad, bodyY, colW, s.bfs, s.bodyColor ?? "#374151", 2);
  const rightElements = buildStackedTextElements(
    rightText,
    colPad + colW + gutter,
    bodyY,
    colW,
    s.bfs,
    s.bodyColor ?? "#374151",
    2 + leftElements.length,
  );

  return [
    textEl(s.title, 1, {
      x: colPad,
      y: 32,
      w: MODULES_STAGE_W - colPad * 2,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: s.titleAlign,
    }),
    ...leftElements,
    ...rightElements,
  ];
}

// ── image-right: text left, image right ─────────────────────────
function buildImageRightSlide(s: ResolvedSpec, imageSrc?: string): Slide["elements"] {
  const textX = PAD_H - 24;
  const textW = imageSrc ? 490 : BODY_W;
  const imgX = 524;
  const imgW = MODULES_STAGE_W - imgX - 36;
  const imgY = 32;
  const imgH = STAGE_H - imgY - PAD_V;

  const titleH = clampH(PAD_V, estimateTextHeight(s.title, textW, s.tfs) + 8, 16);
  const bodyY = PAD_V + titleH + 18;

  const elements: Slide["elements"] = [
    textEl(s.title, 2, {
      x: textX,
      y: PAD_V,
      w: textW,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: s.titleAlign,
    }),
    ...buildStackedTextElements(s.body ?? "", textX, bodyY, textW, s.bfs, s.bodyColor ?? "#374151", 3),
  ];

  if (imageSrc) {
    elements.unshift(
      createImageElement(imageSrc, 1, {
        x: imgX,
        y: imgY,
        w: imgW,
        h: imgH,
      }),
    );
  }
  return elements;
}

// ── image-left: image left, text right ──────────────────────────
function buildImageLeftSlide(s: ResolvedSpec, imageSrc?: string): Slide["elements"] {
  const imgW = 380;
  const imgX = 36;
  const imgY = 32;
  const imgH = STAGE_H - imgY - PAD_V;
  const textX = imageSrc ? imgX + imgW + 24 : PAD_H;
  const textW = imageSrc ? MODULES_STAGE_W - textX - (PAD_H - 24) : BODY_W;

  const titleH = clampH(PAD_V, estimateTextHeight(s.title, textW, s.tfs) + 8, 16);
  const bodyY = PAD_V + titleH + 18;

  const elements: Slide["elements"] = [
    textEl(s.title, 2, {
      x: textX,
      y: PAD_V,
      w: textW,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: s.titleAlign,
    }),
    ...buildStackedTextElements(s.body ?? "", textX, bodyY, textW, s.bfs, s.bodyColor ?? "#374151", 3),
  ];

  if (imageSrc) {
    elements.unshift(
      createImageElement(imageSrc, 1, {
        x: imgX,
        y: imgY,
        w: imgW,
        h: imgH,
      }),
    );
  }
  return elements;
}

// ── image-hero: title (+ optional subtitle) over clean bg ───────
function buildImageHeroSlide(s: ResolvedSpec): TextEl[] {
  const titleY = Math.floor(STAGE_H * 0.32);
  const titleH = clampH(titleY, estimateTextHeight(s.title, BODY_W, s.tfs) + 12, 24);
  const elements: TextEl[] = [
    textEl(s.title, 1, {
      x: PAD_H,
      y: titleY,
      w: BODY_W,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: "center",
    }),
  ];

  if (s.body?.trim()) {
    const bodyY = titleY + titleH + 16;
    const bodyH = clampH(bodyY, estimateTextHeight(s.body, BODY_W + 40, s.bfs), 28);
    elements.push(
      textEl(s.body, 2, {
        x: PAD_H - 20,
        y: bodyY,
        w: BODY_W + 40,
        h: bodyH,
        fontSize: s.bfs,
        fontWeight: 400,
        fontStyle: FONT,
        color: s.bodyColor ?? "#374151",
        align: "center",
      }),
    );
  }
  return elements;
}

/* ── Public API ────────────────────────────────────────────────── */

type ImageAssets = {
  imageSrc?: string;
  backgroundImage?: string;
};

export function buildSlideFromGenerated(
  raw: Partial<GeneratedDeckSlide>,
  assets: ImageAssets = {},
): Slide {
  const spec = normalizeGeneratedSlide(raw);
  const s = resolveSpec(spec);
  const slide = createEmptySlide("content");
  slide.notes = s.notes;

  // AI-generated background image takes priority; solid slides use neutral default.
  if (assets.backgroundImage) {
    slide.background = assets.backgroundImage;
  } else {
    slide.background = s.background ?? "#f4f4f5";
  }

  switch (s.layout) {
    case "title":
      slide.elements = buildTitleSlide(s);
      break;
    case "bullets":
      slide.elements = buildBulletsSlide(s, assets.imageSrc);
      break;
    case "two-column":
      slide.elements = buildTwoColumnSlide(s);
      break;
    case "image-right":
      slide.elements = buildImageRightSlide(s, assets.imageSrc);
      break;
    case "image-left":
      slide.elements = buildImageLeftSlide(s, assets.imageSrc);
      break;
    case "image-hero":
      slide.elements = buildImageHeroSlide(s);
      break;
    default:
      slide.elements = buildTitleBodySlide(s, assets.imageSrc);
  }

  return slide;
}

export function buildSlidesFromGenerated(
  specs: Partial<GeneratedDeckSlide>[],
  assetsList: ImageAssets[] = [],
): Slide[] {
  return specs.map((spec, i) => buildSlideFromGenerated(spec, assetsList[i] ?? {}));
}
