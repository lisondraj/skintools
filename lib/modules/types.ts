export const MODULES_STAGE_W = 960;
export const MODULES_STAGE_H = 540;

export type TextAlign = "left" | "center" | "right";

/** Font style id — see SLIDE_FONT_STYLES in lib/modules/fonts.ts */
export type TextFontStyle = string;

export interface TextElement {
  kind: "text";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  text: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: TextFontStyle;
  color: string;
  align: TextAlign;
}

export interface ImageElement {
  kind: "image";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  src: string;
  /** True while image src is being generated or fetched. */
  loading?: boolean;
}

export type ShapeKind =
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "star"
  | "line"
  | "arrow"
  | "chevron";

export interface ShapeElement {
  kind: "shape";
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export type SlideElement = TextElement | ImageElement | ShapeElement;

export type PatientSimDifficulty = "easy" | "moderate" | "challenging";

export interface PatientSimConfig {
  persona: string;
  scenario: string;
  difficulty: PatientSimDifficulty;
  /** Consultation time limit in minutes (2–20). Default 5. */
  timeLimitMinutes?: number;
}

export type SlideKind = "content" | "patient-sim";

export interface Slide {
  id: string;
  kind: SlideKind;
  background: string;
  elements: SlideElement[];
  notes?: string;
  sim?: PatientSimConfig;
}

export interface Deck {
  id: string;
  title: string;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
}

export type AutofillMode =
  | "generate"
  | "rewrite"
  | "expand"
  | "shorten"
  | "slide"
  | "edit-selection"
  | "simplify"
  | "clinical"
  | "bullets"
  | "grammar"
  | "summarize"
  | "notes";

export interface AutofillReq {
  mode: AutofillMode;
  prompt?: string;
  existingText?: string;
  /** Highlighted portion inside existingText to rewrite. */
  selectedText?: string;
  selectionStart?: number;
  selectionEnd?: number;
  deckTitle?: string;
  /** Rich slide + deck context for all AI calls. */
  slideContext?: string;
  /** Slide images for vision context (current + adjacent slides). */
  contextImages?: SlideContextImage[];
}

export interface SlideContextImage {
  label: string;
  url: string;
}

export interface AutofillRes {
  text: string;
}

export interface SlideLayoutRes {
  elements: SlideElement[];
  background: string;
  notes?: string;
}

export type SlideImagePurpose = "image" | "background" | "infographic";

export interface GenerateImageReq {
  prompt: string;
  purpose?: SlideImagePurpose;
  qualityMode?: "fast" | "quality";
}

export interface GenerateImageRes {
  image: string;
}

export interface GenerateDeckReq {
  prompt: string;
  slideCount?: number;
  deckTitle?: string;
  slideContext?: string;
  contextImages?: SlideContextImage[];
}

export type GeneratedSlideLayout =
  | "title"
  | "title-body"
  | "bullets"
  | "two-column"
  | "image-right"
  | "image-left"
  | "image-hero";

export type GeneratedSlideBackgroundStyle = "white" | "solid" | "ai";

export interface GeneratedDeckSlide {
  title: string;
  body?: string;
  leftBody?: string;
  rightBody?: string;
  notes?: string;
  layout: GeneratedSlideLayout;
  /** white = #ffffff; solid = soft hex in background; ai = GPT Image 2 full-slide background. */
  backgroundStyle?: GeneratedSlideBackgroundStyle;
  background?: string;
  /** Describe AI background visuals — must relate to slide title/body when backgroundStyle is ai. */
  backgroundImagePrompt?: string;
  imagePrompt?: string;
  titleFontStyle?: string;
  bodyFontStyle?: string;
  titleFontSize?: number;
  bodyFontSize?: number;
  titleColor?: string;
  bodyColor?: string;
  titleAlign?: TextAlign;
}

export interface GenerateDeckRes {
  deckTitle: string;
  slides: Slide[];
}

export interface RealtimeSessionReq {
  sim: PatientSimConfig;
}

export interface RealtimeSessionRes {
  signedUrl: string;
  voiceId: string;
}

export const DEFAULT_PATIENT_SIM: PatientSimConfig = {
  persona: "Anxious adult patient with a new skin diagnosis",
  scenario:
    "You just received a diagnosis and want clear, reassuring answers about what it means and what to do next.",
  difficulty: "moderate",
  timeLimitMinutes: 5,
};

/** Default ElevenLabs voice when ELEVENLABS_VOICE_ID is not set (SkinTools agent voice). */
export const DEFAULT_ELEVENLABS_VOICE_ID = "cjVigY5qzO86Huf0OWal";

/** SkinTools ConvAI agent — set ELEVENLABS_AGENT_ID in production. */
export const DEFAULT_ELEVENLABS_AGENT_ID = "agent_3401kv4c6fgyew1bp5gvnxhdq7bz";
