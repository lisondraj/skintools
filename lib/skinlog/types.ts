export type ScanMode = "single" | "full-body";

export type LesionAttributes = {
  /** Primary morphology: macule, patch, papule, plaque, nodule, vesicle, scale, crust, scar, etc. */
  morphology: string;
  /** Estimated size or extent */
  size: string;
  /** Color and pigmentation */
  color: string;
  /** Distribution / pattern: solitary, grouped, linear, scattered, confluent, etc. */
  distribution: string;
  /** Surface: smooth, scaly, crusted, lichenified, atrophic, ulcerated, etc. */
  surface: string;
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
