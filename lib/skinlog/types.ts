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
  lesions: StoredLesion[];
};

export type AnalyzeRequest = {
  photo: string;
  mode: ScanMode;
};

export type AnalyzeResponse = {
  lesions: Lesion[];
};
