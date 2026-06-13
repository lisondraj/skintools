export type GenerateRequest = {
  prompt: string;
};

export type EditRequest = {
  image: string;
  mask?: string;
  prompt: string;
};

export type ImageResponse = {
  image: string;
};

export const REMORPH_STAGE_SIZE = 1024;
