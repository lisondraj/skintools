export type RemorphQualityMode = "fast" | "quality";

export type GenerateRequest = {
  prompt: string;
  qualityMode?: RemorphQualityMode;
};

export type EditRequest = {
  image: string;
  mask?: string;
  prompt: string;
  qualityMode?: RemorphQualityMode;
};

export type SegmentRequest = {
  image: string;
};

export type RemorphFeature = {
  id: string;
  label: string;
  category: string;
  seed: [number, number];
  bbox: [number, number, number, number];
};

export type ImageResponse = {
  image: string;
};

export type SegmentResponse = {
  features: RemorphFeature[];
};

export type RemorphStepKind = "generate" | "edit" | "upload";

export type RemorphAlbumStep = {
  id: string;
  image: string;
  kind: RemorphStepKind;
  prompt?: string;
  createdAt: number;
};

export type RemorphAlbum = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  steps: RemorphAlbumStep[];
};

export const REMORPH_DRAG_MIME = "application/remorph-step";

export type RemorphDragStep = {
  image: string;
  albumId: string;
  stepId: string;
  label: string;
};

export type RemorphComparePane = {
  image: string;
  albumId: string;
  stepId: string;
  label: string;
};

export type TitleRequest = {
  image: string;
};

export type TitleResponse = {
  title: string;
};

export const REMORPH_STAGE_SIZE = 1024;
export const REMORPH_SEG_RES = 512;
export const REMORPH_SKIN_CATEGORY = "skin";
