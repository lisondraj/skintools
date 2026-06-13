declare namespace NodeJS {
  interface ProcessEnv {
    OPENAI_API_KEY?: string;
    OPENAI_VISION_MODEL?: string;
    OPENAI_IMAGE_MODEL?: string;
    SKINLOG_AI_MOCK?: string;
  }
}

export {};
