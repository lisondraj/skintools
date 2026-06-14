export type GenerateRequest = {
  prompt: string;
};

export type EditRequest = {
  image: string;
  mask?: string;
  prompt: string;
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

export const REMORPH_STAGE_SIZE = 1024;
export const REMORPH_SEG_RES = 512;
export const REMORPH_SKIN_CATEGORY = "skin";
