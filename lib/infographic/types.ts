export interface InfographicContent {
  title: string;
  subtitle: string;
  keyFacts: string[]; // 3 short facts
  sections: IGSection[];
  warning: string | null;
  footer: string;
}

export interface IGSection {
  id: string;
  heading: string;
  body: string;
  type: "info" | "tip" | "warning" | "note";
}

// ── SVG vector element types ────────────────────────────────────

interface IGBase {
  id: string;
  selectable?: boolean;
  textEditable?: boolean;
}

export interface IGRectEl extends IGBase {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  opacity?: number;
}

export interface IGTextEl extends IGBase {
  kind: "text";
  x: number;
  y: number;
  rawText: string;
  lines: string[];
  fontSize: number;
  fontWeight?: number | string;
  fill: string;
  anchor?: "start" | "middle" | "end";
  lineH?: number;
  fontStyle?: string;
}

export interface IGCircleEl extends IGBase {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface IGLineEl extends IGBase {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth?: number;
}

export type IGElement = IGRectEl | IGTextEl | IGCircleEl | IGLineEl;

export interface InfographicDoc {
  variant: "A" | "B";
  vw: number;
  vh: number;
  /** gpt-image-2 generated design background (text-free) */
  backgroundImage: string;
  elements: IGElement[];
}

export interface DesignReq {
  diagnosis: string;
}

export interface DesignRes {
  imageA: string;
  imageB: string;
}

export interface GenerateReq {
  diagnosis: string;
  instructions: string;
  language: string;
}

export interface GenerateRes {
  content: InfographicContent;
}

export interface FillReq {
  diagnosis: string;
  language: string;
}

export interface FillRes {
  instructions: string;
}
