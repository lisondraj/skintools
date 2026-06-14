declare namespace NodeJS {
  interface ProcessEnv {
    OPENAI_API_KEY?: string;
    OPENAI_VISION_MODEL?: string;
    OPENAI_IMAGE_MODEL?: string;
    OPENAI_INFOGRAPHIC_IMAGE_MODEL?: string;
    OPENAI_REALTIME_MODEL?: string;
    OPENAI_REALTIME_VOICE?: string;
    SKINLOG_AI_MOCK?: string;
  }
}

export {};
