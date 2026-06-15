export const MODULES_STAGE_W = 960;
export const MODULES_STAGE_H = 540;

export type TextAlign = "left" | "center" | "right";

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
}

export type SlideElement = TextElement | ImageElement;

export type PatientSimDifficulty = "easy" | "moderate" | "challenging";

export interface PatientSimConfig {
  persona: string;
  scenario: string;
  difficulty: PatientSimDifficulty;
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
}

export interface AutofillRes {
  text: string;
}

export interface SlideLayoutRes {
  title: string;
  body: string;
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
};

/** Default ElevenLabs voice when ELEVENLABS_VOICE_ID is not set. */
export const DEFAULT_ELEVENLABS_VOICE_ID = "cgSgspJ2msm6clMCkdW9";
