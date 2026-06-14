export type InfographicQualityMode = "fast" | "standard";

export interface InfographicContent {
  title: string;
  subtitle: string;
  keyFacts: string[];
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

export interface InfographicDesign {
  variant: "A" | "B";
  image: string;
}

export interface DesignReq {
  content: InfographicContent;
  language: string;
}

export interface DesignRes {
  imageA: string;
  imageB: string;
}

export interface EditReq {
  image: string;
  prompt: string;
}

export interface EditRes {
  image: string;
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

export interface InfographicPreset {
  id: string;
  label: string;
  prompt: string;
}

export interface PresetGroup {
  id: "theme" | "language" | "audience";
  label: string;
  presets: InfographicPreset[];
}
