export type ScanMode = "single" | "full-body";

export type LesionAttributes = {
  size: string;
  color: string;
  shape: string;
  border: string;
  notes: string;
};

export type Lesion = {
  id: string;
  bodyLocation?: string;
  description: string;
  attributes: LesionAttributes;
};

export type StoredLesion = Lesion & {
  photo: string;
};

export type ScanEntry = {
  id: string;
  mode: ScanMode;
  date: string;
  createdAt: number;
  source: "openai" | "mock";
  lesions: StoredLesion[];
};

export type AnalyzeRequest = {
  photo: string;
  mode: ScanMode;
};

export type AnalyzeResponse = {
  lesions: Lesion[];
  source: "openai" | "mock";
};

export type AnalyzeStatusResponse = {
  configured: boolean;
  mockMode: boolean;
  model: string | null;
};
