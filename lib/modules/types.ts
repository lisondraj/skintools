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
  voice: string;
  difficulty: PatientSimDifficulty;
}

export type SlideKind = "content" | "patient-sim";

export interface Slide {
  id: string;
  kind: SlideKind;
  background: string;
  elements: SlideElement[];
  sim?: PatientSimConfig;
}

export interface Deck {
  id: string;
  title: string;
  slides: Slide[];
  createdAt: number;
  updatedAt: number;
}

export type AutofillMode = "generate" | "rewrite" | "expand" | "shorten";

export interface AutofillReq {
  mode: AutofillMode;
  prompt?: string;
  existingText?: string;
  deckTitle?: string;
  slideContext?: string;
}

export interface AutofillRes {
  text: string;
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
  voice: "alloy",
  difficulty: "moderate",
};

/** ElevenLabs pre-built voices available for ConvAI agents. */
export interface ElevenLabsVoice {
  id: string;
  label: string;
}

export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica (conversational)" },
  { id: "iP95p4xoKVk53GoZ742B", label: "Chris (professional)" },
  { id: "9BWtsMINqrJLrRacOk9x", label: "Aria (warm)" },
  { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte (empathetic)" },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian (calm)" },
  { id: "pqHfZKP75CvOlQylNhV4", label: "Bill (authoritative)" },
  { id: "bIHbv24MWmeRgasZH58o", label: "Will (friendly)" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella (soothing)" },
];
