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
  if (value === "white" || value === "solid" || value === "ai") return value;
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
    // Solid/fallback background hex.
    background: normalizeColor(raw.background, "#f8fafc"),
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

/* ── Height estimation ─────────────────────────────────────────── */

/**
 * Estimate the pixel height a block of text will occupy inside a box of
 * the given width using Inter at the given fontSize with line-height 1.5
 * and ~1.7 chars-per-pixel-of-width (empirical for Inter at 16–24px).
 */
function estimateTextHeight(text: string, boxW: number, fontSize: number): number {
  const LINE_H = Math.round(fontSize * 1.5);
  const charsPerLine = Math.max(1, Math.floor((boxW / fontSize) * 1.7));

  const lines = text.split("\n");
  let totalLines = 0;
  for (const line of lines) {
    totalLines += Math.max(1, Math.ceil(line.trimEnd().length / charsPerLine));
  }
  return totalLines * LINE_H + 16; // +16 for internal padding
}

/** Clamp a box so it doesn't overflow the stage vertically. */
function clampH(y: number, h: number, bottomPad = PAD_V): number {
  return Math.min(h, STAGE_H - y - bottomPad);
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
        color: s.bodyColor,
        align: "center",
      }),
    );
  }
  return elements;
}

// ── title-body: title + body paragraph/bullets ──────────────────
function buildTitleBodySlide(s: ResolvedSpec): TextEl[] {
  const titleY = PAD_V;
  const titleH = clampH(titleY, estimateTextHeight(s.title, BODY_W, s.tfs) + 8, 20);
  const bodyY = titleY + titleH + 20;
  const bodyH = clampH(bodyY, estimateTextHeight(s.body ?? "", BODY_W, s.bfs), PAD_V);

  return [
    textEl(s.title, 1, {
      x: PAD_H,
      y: titleY,
      w: BODY_W,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: s.titleAlign,
    }),
    textEl(s.body ?? "", 2, {
      x: PAD_H,
      y: bodyY,
      w: BODY_W,
      h: bodyH,
      fontSize: s.bfs,
      fontWeight: 400,
      fontStyle: FONT,
      color: s.bodyColor,
      align: "left",
    }),
  ];
}

// ── bullets: title + section-break bullets ──────────────────────
function buildBulletsSlide(s: ResolvedSpec): TextEl[] {
  const titleY = PAD_V - 4;
  const titleH = clampH(titleY, estimateTextHeight(s.title, BODY_W, s.tfs) + 8, 16);
  const bodyY = titleY + titleH + 18;
  const bodyH = clampH(bodyY, estimateTextHeight(s.body ?? "", BODY_W, s.bfs), PAD_V);

  return [
    textEl(s.title, 1, {
      x: PAD_H,
      y: titleY,
      w: BODY_W,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: s.titleAlign,
    }),
    textEl(s.body ?? "", 2, {
      x: PAD_H,
      y: bodyY,
      w: BODY_W,
      h: bodyH,
      fontSize: s.bfs,
      fontWeight: 400,
      fontStyle: FONT,
      color: s.bodyColor,
      align: "left",
    }),
  ];
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
  const bodyH = clampH(bodyY, Math.max(
    estimateTextHeight(leftText, colW, s.bfs),
    estimateTextHeight(rightText, colW, s.bfs),
  ), PAD_V);

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
    textEl(leftText, 2, {
      x: colPad,
      y: bodyY,
      w: colW,
      h: bodyH,
      fontSize: s.bfs,
      fontWeight: 400,
      fontStyle: FONT,
      color: s.bodyColor,
      align: "left",
    }),
    textEl(rightText, 3, {
      x: colPad + colW + gutter,
      y: bodyY,
      w: colW,
      h: bodyH,
      fontSize: s.bfs,
      fontWeight: 400,
      fontStyle: FONT,
      color: s.bodyColor,
      align: "left",
    }),
  ];
}

// ── image-right: text left, image right ─────────────────────────
function buildImageRightSlide(s: ResolvedSpec, imageSrc?: string): Slide["elements"] {
  const textW = imageSrc ? 490 : BODY_W;
  const imgX = 524;
  const imgW = MODULES_STAGE_W - imgX - 36;
  const imgY = 32;
  const imgH = STAGE_H - imgY - PAD_V;

  const titleH = clampH(PAD_V, estimateTextHeight(s.title, textW - 16, s.tfs) + 8, 16);
  const bodyY = PAD_V + titleH + 18;
  const bodyH = clampH(bodyY, estimateTextHeight(s.body ?? "", textW - 16, s.bfs), PAD_V);

  const elements: Slide["elements"] = [
    textEl(s.title, 2, {
      x: PAD_H - 24,
      y: PAD_V,
      w: textW,
      h: titleH,
      fontSize: s.tfs,
      fontWeight: 700,
      fontStyle: FONT,
      color: s.titleColor,
      align: s.titleAlign,
    }),
    textEl(s.body ?? "", 3, {
      x: PAD_H - 24,
      y: bodyY,
      w: textW,
      h: bodyH,
      fontSize: s.bfs,
      fontWeight: 400,
      fontStyle: FONT,
      color: s.bodyColor,
      align: "left",
    }),
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

  const titleH = clampH(PAD_V, estimateTextHeight(s.title, textW - 16, s.tfs) + 8, 16);
  const bodyY = PAD_V + titleH + 18;
  const bodyH = clampH(bodyY, estimateTextHeight(s.body ?? "", textW - 16, s.bfs), PAD_V);

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
    textEl(s.body ?? "", 3, {
      x: textX,
      y: bodyY,
      w: textW,
      h: bodyH,
      fontSize: s.bfs,
      fontWeight: 400,
      fontStyle: FONT,
      color: s.bodyColor,
      align: "left",
    }),
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
        color: s.bodyColor,
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

  // AI-generated background image takes priority; fall back to solid hex.
  if (assets.backgroundImage) {
    slide.background = assets.backgroundImage;
  } else {
    slide.background = s.background ?? "#f8fafc";
  }

  switch (s.layout) {
    case "title":
      slide.elements = buildTitleSlide(s);
      break;
    case "bullets":
      slide.elements = buildBulletsSlide(s);
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
      slide.elements = buildTitleBodySlide(s);
  }

  return slide;
}

export function buildSlidesFromGenerated(
  specs: Partial<GeneratedDeckSlide>[],
  assetsList: ImageAssets[] = [],
): Slide[] {
  return specs.map((spec, i) => buildSlideFromGenerated(spec, assetsList[i] ?? {}));
}
