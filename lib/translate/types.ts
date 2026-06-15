export interface LanguageOption {
  code: string;
  label: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "zh", label: "Mandarin Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ru", label: "Russian" },
  { code: "vi", label: "Vietnamese" },
  { code: "tl", label: "Tagalog" },
  { code: "pl", label: "Polish" },
  { code: "nl", label: "Dutch" },
];

export const DEFAULT_TARGET_LANG = LANGUAGES[0];

export interface TranslateConfig {
  targetLang: string;
  targetLangLabel: string;
  speakerLabel?: string;
}

export type TranslateRole = "speaker" | "you";

export interface TranslateTurn {
  role: TranslateRole;
  original: string;
  translated: string;
  detectedLang?: string;
  at: number;
}

export interface TranslateSession {
  id: string;
  createdAt: number;
  config: TranslateConfig;
  durationSec: number;
  turns: TranslateTurn[];
}

export interface TranslateRequest {
  text: string;
  targetLangLabel: string;
}

export interface TranslateResponse {
  translated: string;
  detectedLang: string;
}
