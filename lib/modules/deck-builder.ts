import { SLIDE_FONT_STYLES } from "./fonts";
import { createEmptySlide } from "./storage";
import { createImageElement, createTextElement } from "./elements";
import type {
  GeneratedDeckSlide,
  GeneratedSlideLayout,
  Slide,
  TextAlign,
} from "./types";
import { MODULES_STAGE_W } from "./types";

const VALID_LAYOUTS: GeneratedSlideLayout[] = [
  "title",
  "title-body",
  "bullets",
  "two-column",
  "image-right",
  "image-left",
  "image-hero",
];

const VALID_FONT_IDS = new Set(SLIDE_FONT_STYLES.map((f) => f.id));

function normalizeLayout(value: unknown): GeneratedSlideLayout {
  if (typeof value === "string" && VALID_LAYOUTS.includes(value as GeneratedSlideLayout)) {
    return value as GeneratedSlideLayout;
  }
  return "title-body";
}

function normalizeFont(value: unknown, fallback = "inter"): string {
  if (typeof value === "string" && VALID_FONT_IDS.has(value)) return value;
  return fallback;
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

export function normalizeGeneratedSlide(raw: Partial<GeneratedDeckSlide>): GeneratedDeckSlide {
  const layout = normalizeLayout(raw.layout);
  return {
    title: String(raw.title ?? "Untitled").trim() || "Untitled",
    body: raw.body != null ? String(raw.body).trim() : undefined,
    leftBody: raw.leftBody != null ? String(raw.leftBody).trim() : undefined,
    rightBody: raw.rightBody != null ? String(raw.rightBody).trim() : undefined,
    notes: raw.notes != null ? String(raw.notes).trim() : undefined,
    layout,
    background: normalizeColor(raw.background, layout === "image-hero" ? "#0f172a" : "#ffffff"),
    backgroundImagePrompt:
      typeof raw.backgroundImagePrompt === "string" ? raw.backgroundImagePrompt.trim() : undefined,
    imagePrompt: typeof raw.imagePrompt === "string" ? raw.imagePrompt.trim() : undefined,
    titleFontStyle: normalizeFont(raw.titleFontStyle, layout === "title" ? "playfair" : "inter"),
    bodyFontStyle: normalizeFont(raw.bodyFontStyle, "inter"),
    titleFontSize: normalizeFontSize(
      raw.titleFontSize,
      layout === "title" ? 52 : layout === "bullets" ? 32 : 36,
    ),
    bodyFontSize: normalizeFontSize(
      raw.bodyFontSize,
      layout === "title" ? 24 : layout === "two-column" ? 20 : 22,
    ),
    titleColor: normalizeColor(raw.titleColor, layout === "image-hero" ? "#ffffff" : "#111111"),
    bodyColor: normalizeColor(raw.bodyColor, layout === "image-hero" ? "#f1f5f9" : "#374151"),
    titleAlign: normalizeAlign(raw.titleAlign, layout === "title" ? "center" : "left"),
  };
}

type ImageAssets = {
  imageSrc?: string;
  backgroundImage?: string;
};

function textEl(
  text: string,
  z: number,
  opts: Partial<Parameters<typeof createTextElement>[2]>,
) {
  return createTextElement(text, z, opts);
}

function buildTitleSlide(spec: GeneratedDeckSlide): ReturnType<typeof createTextElement>[] {
  const pad = 80;
  const w = MODULES_STAGE_W - pad * 2;
  const elements = [
    textEl(spec.title, 1, {
      x: pad,
      y: 170,
      w,
      h: 110,
      fontSize: spec.titleFontSize,
      fontWeight: 600,
      fontStyle: spec.titleFontStyle,
      color: spec.titleColor,
      align: spec.titleAlign,
    }),
  ];
  if (spec.body?.trim()) {
    elements.push(
      textEl(spec.body, 2, {
        x: pad,
        y: 300,
        w,
        h: 80,
        fontSize: spec.bodyFontSize,
        fontWeight: 400,
        fontStyle: spec.bodyFontStyle,
        color: spec.bodyColor,
        align: "center",
      }),
    );
  }
  return elements;
}

function buildTitleBodySlide(spec: GeneratedDeckSlide): ReturnType<typeof createTextElement>[] {
  const pad = 80;
  const w = MODULES_STAGE_W - pad * 2;
  return [
    textEl(spec.title, 1, {
      x: pad,
      y: 56,
      w,
      h: 72,
      fontSize: spec.titleFontSize,
      fontWeight: 600,
      fontStyle: spec.titleFontStyle,
      color: spec.titleColor,
      align: spec.titleAlign,
    }),
    textEl(spec.body ?? "", 2, {
      x: pad,
      y: 148,
      w,
      h: 320,
      fontSize: spec.bodyFontSize,
      fontWeight: 400,
      fontStyle: spec.bodyFontStyle,
      color: spec.bodyColor,
      align: "left",
    }),
  ];
}

function buildBulletsSlide(spec: GeneratedDeckSlide): ReturnType<typeof createTextElement>[] {
  const pad = 80;
  const w = MODULES_STAGE_W - pad * 2;
  return [
    textEl(spec.title, 1, {
      x: pad,
      y: 44,
      w,
      h: 60,
      fontSize: spec.titleFontSize,
      fontWeight: 600,
      fontStyle: spec.titleFontStyle,
      color: spec.titleColor,
      align: spec.titleAlign,
    }),
    textEl(spec.body ?? "", 2, {
      x: pad,
      y: 120,
      w,
      h: 360,
      fontSize: spec.bodyFontSize,
      fontWeight: 400,
      fontStyle: spec.bodyFontStyle,
      color: spec.bodyColor,
      align: "left",
    }),
  ];
}

function buildTwoColumnSlide(spec: GeneratedDeckSlide): ReturnType<typeof createTextElement>[] {
  const pad = 48;
  return [
    textEl(spec.title, 1, {
      x: pad,
      y: 36,
      w: MODULES_STAGE_W - pad * 2,
      h: 56,
      fontSize: spec.titleFontSize,
      fontWeight: 600,
      fontStyle: spec.titleFontStyle,
      color: spec.titleColor,
      align: spec.titleAlign,
    }),
    textEl(spec.leftBody ?? spec.body ?? "", 2, {
      x: pad,
      y: 108,
      w: 420,
      h: 400,
      fontSize: spec.bodyFontSize,
      fontWeight: 400,
      fontStyle: spec.bodyFontStyle,
      color: spec.bodyColor,
      align: "left",
    }),
    textEl(spec.rightBody ?? "", 3, {
      x: 492,
      y: 108,
      w: 420,
      h: 400,
      fontSize: spec.bodyFontSize,
      fontWeight: 400,
      fontStyle: spec.bodyFontStyle,
      color: spec.bodyColor,
      align: "left",
    }),
  ];
}

function buildImageRightSlide(
  spec: GeneratedDeckSlide,
  imageSrc?: string,
): Slide["elements"] {
  const pad = 48;
  const elements: Slide["elements"] = [
    textEl(spec.title, 2, {
      x: pad,
      y: 44,
      w: 480,
      h: 64,
      fontSize: spec.titleFontSize,
      fontWeight: 600,
      fontStyle: spec.titleFontStyle,
      color: spec.titleColor,
      align: spec.titleAlign,
    }),
    textEl(spec.body ?? "", 3, {
      x: pad,
      y: 120,
      w: 480,
      h: 380,
      fontSize: spec.bodyFontSize,
      fontWeight: 400,
      fontStyle: spec.bodyFontStyle,
      color: spec.bodyColor,
      align: "left",
    }),
  ];
  if (imageSrc) {
    elements.unshift(
      createImageElement(imageSrc, 1, {
        x: 560,
        y: 52,
        w: 360,
        h: 436,
      }),
    );
  }
  return elements;
}

function buildImageLeftSlide(
  spec: GeneratedDeckSlide,
  imageSrc?: string,
): Slide["elements"] {
  const elements: Slide["elements"] = [
    textEl(spec.title, 2, {
      x: 430,
      y: 44,
      w: 490,
      h: 64,
      fontSize: spec.titleFontSize,
      fontWeight: 600,
      fontStyle: spec.titleFontStyle,
      color: spec.titleColor,
      align: spec.titleAlign,
    }),
    textEl(spec.body ?? "", 3, {
      x: 430,
      y: 120,
      w: 490,
      h: 380,
      fontSize: spec.bodyFontSize,
      fontWeight: 400,
      fontStyle: spec.bodyFontStyle,
      color: spec.bodyColor,
      align: "left",
    }),
  ];
  if (imageSrc) {
    elements.unshift(
      createImageElement(imageSrc, 1, {
        x: 40,
        y: 52,
        w: 360,
        h: 436,
      }),
    );
  }
  return elements;
}

function buildImageHeroSlide(spec: GeneratedDeckSlide): ReturnType<typeof createTextElement>[] {
  const pad = 80;
  const w = MODULES_STAGE_W - pad * 2;
  const elements = [
    textEl(spec.title, 1, {
      x: pad,
      y: 200,
      w,
      h: 100,
      fontSize: spec.titleFontSize,
      fontWeight: 600,
      fontStyle: spec.titleFontStyle,
      color: spec.titleColor,
      align: "center",
    }),
  ];
  if (spec.body?.trim()) {
    elements.push(
      textEl(spec.body, 2, {
        x: pad,
        y: 320,
        w,
        h: 100,
        fontSize: spec.bodyFontSize,
        fontWeight: 400,
        fontStyle: spec.bodyFontStyle,
        color: spec.bodyColor,
        align: "center",
      }),
    );
  }
  return elements;
}

export function buildSlideFromGenerated(
  raw: Partial<GeneratedDeckSlide>,
  assets: ImageAssets = {},
): Slide {
  const spec = normalizeGeneratedSlide(raw);
  const slide = createEmptySlide("content");
  slide.notes = spec.notes;
  slide.background = assets.backgroundImage ?? spec.background ?? "#ffffff";

  switch (spec.layout) {
    case "title":
      slide.elements = buildTitleSlide(spec);
      break;
    case "bullets":
      slide.elements = buildBulletsSlide(spec);
      break;
    case "two-column":
      slide.elements = buildTwoColumnSlide(spec);
      break;
    case "image-right":
      slide.elements = buildImageRightSlide(spec, assets.imageSrc);
      break;
    case "image-left":
      slide.elements = buildImageLeftSlide(spec, assets.imageSrc);
      break;
    case "image-hero":
      slide.elements = buildImageHeroSlide(spec);
      if (assets.backgroundImage) slide.background = assets.backgroundImage;
      break;
    default:
      slide.elements = buildTitleBodySlide(spec);
  }

  return slide;
}

export function buildSlidesFromGenerated(
  specs: Partial<GeneratedDeckSlide>[],
  assetsList: ImageAssets[] = [],
): Slide[] {
  return specs.map((spec, i) => buildSlideFromGenerated(spec, assetsList[i] ?? {}));
}
