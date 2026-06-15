/** Web Speech API types — not guaranteed in lib.dom. */

export interface SpeechRecognitionEventResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionEventResult;
  [index: number]: SpeechRecognitionEventResult;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognition() !== null;
}

export type SpeechCallbacks = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
};

export function createSpeechRecognition(callbacks: SpeechCallbacks): SpeechRecognitionInstance | null {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  // Leave lang unset for browser default / auto-detect behaviour.

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interim = "";
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript?.trim() ?? "";
      if (!transcript) continue;
      if (result.isFinal) {
        finalText += (finalText ? " " : "") + transcript;
      } else {
        interim += (interim ? " " : "") + transcript;
      }
    }

    if (interim) callbacks.onInterim(interim);
    if (finalText) callbacks.onFinal(finalText);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (event.error === "aborted" || event.error === "no-speech") return;
    callbacks.onError(event.message || event.error || "Speech recognition error.");
  };

  recognition.onend = () => {
    callbacks.onEnd?.();
  };

  return recognition;
}

export const SPEECH_UNSUPPORTED_MESSAGE =
  "Live captions need a browser with speech recognition (Chrome, Edge, or Safari). Firefox is not supported.";
