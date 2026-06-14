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

export type RemorphRegion = {
  id: string;
  label: string;
  category: string;
  polygon: [number, number][];
};

export type ImageResponse = {
  image: string;
};

export type SegmentResponse = {
  regions: RemorphRegion[];
};

export const REMORPH_STAGE_SIZE = 1024;
