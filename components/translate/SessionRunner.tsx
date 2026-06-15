"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@/components/translate/Conversation";
import { checkTranslateConfigured, translateText } from "@/lib/translate/client";
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  SPEECH_UNSUPPORTED_MESSAGE,
} from "@/lib/translate/speech";
import type { SpeechRecognitionInstance } from "@/lib/translate/speech";
import type { TranslateConfig, TranslateRole, TranslateTurn } from "@/lib/translate/types";

type SessionResult = {
  turns: TranslateTurn[];
  durationSec: number;
};

type Props = {
  config: TranslateConfig;
  autoStart?: boolean;
  onComplete: (result: SessionResult) => void;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SessionRunner({ config, autoStart = false, onComplete }: Props) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [turns, setTurns] = useState<TranslateTurn[]>([]);
  const [nextRole, setNextRole] = useState<TranslateRole>("speaker");
  const [error, setError] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [translating, setTranslating] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const turnsRef = useRef<TranslateTurn[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<number>(0);
  const startedRef = useRef(false);
  const activeRef = useRef(false);
  const nextRoleRef = useRef<TranslateRole>("speaker");
  const processingRef = useRef(false);

  const appendTurn = useCallback((turn: TranslateTurn) => {
    turnsRef.current = [...turnsRef.current, turn];
    setTurns([...turnsRef.current]);
  }, []);

  const finish = useCallback(() => {
    activeRef.current = false;
    setListening(false);
    window.clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const durationSec = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;
    onComplete({ turns: turnsRef.current, durationSec });
  }, [onComplete]);

  const handleFinal = useCallback(
    async (text: string) => {
      if (!text.trim() || processingRef.current) return;
      processingRef.current = true;
      setInterim("");
      setTranslating(true);

      const at = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;
      const role = nextRoleRef.current;

      try {
        const result = await translateText({
          text: text.trim(),
          targetLangLabel: config.targetLangLabel,
        });

        appendTurn({
          role,
          original: text.trim(),
          translated: result.translated || text.trim(),
          detectedLang: result.detectedLang,
          at,
        });
      } catch (err) {
        appendTurn({
          role,
          original: text.trim(),
          translated: text.trim(),
          at,
        });
        setError(err instanceof Error ? err.message : "Translation failed.");
      } finally {
        setTranslating(false);
        processingRef.current = false;
      }
    },
    [appendTurn, config.targetLangLabel],
  );

  const start = useCallback(async () => {
    setError("");

    if (!isSpeechRecognitionSupported()) {
      setError(SPEECH_UNSUPPORTED_MESSAGE);
      return;
    }

    try {
      const configured = await checkTranslateConfigured();
      if (!configured) {
        setError("OpenAI API key not configured. Translation requires OPENAI_API_KEY.");
        return;
      }
    } catch {
      setError("Could not verify translation service.");
      return;
    }

    const recognition = createSpeechRecognition({
      onInterim: (text) => setInterim(text),
      onFinal: (text) => {
        void handleFinal(text);
      },
      onError: (message) => {
        if (activeRef.current) setError(message);
      },
      onEnd: () => {
        if (activeRef.current) {
          try {
            recognitionRef.current?.start();
          } catch {
            setListening(false);
          }
        }
      },
    });

    if (!recognition) {
      setError(SPEECH_UNSUPPORTED_MESSAGE);
      return;
    }

    recognitionRef.current = recognition;
    activeRef.current = true;
    startTimeRef.current = Date.now();
    setElapsedSec(0);
    setListening(true);
    startedRef.current = true;

    timerRef.current = window.setInterval(() => {
      if (!startTimeRef.current) return;
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    try {
      recognition.start();
    } catch (err) {
      activeRef.current = false;
      setListening(false);
      setError(err instanceof Error ? err.message : "Could not start microphone.");
    }
  }, [handleFinal]);

  useEffect(() => {
    nextRoleRef.current = nextRole;
  }, [nextRole]);

  useEffect(() => {
    if (autoStart && !startedRef.current) void start();
  }, [autoStart, start]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      window.clearInterval(timerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  return (
    <div className="tr-runner">
      <header className="tr-runner__header">
        <span className="tr-runner__status">
          {listening ? (translating ? "Translating…" : "Listening") : "Stopped"}
        </span>
        <span className="tr-runner__timer">{formatElapsed(elapsedSec)}</span>
      </header>

      <div className="tr-runner__live">
        {interim ? (
          <p className="tr-runner__caption is-interim">{interim}</p>
        ) : (
          <p className="tr-runner__caption-placeholder">
            {listening
              ? `Speak naturally — captions translate to ${config.targetLangLabel}.`
              : "Start listening to begin."}
          </p>
        )}
      </div>

      <div>
        <p className="tr-runner__transcript-label">Conversation</p>
        <Conversation
          turns={turns}
          live
          speakerLabel={config.speakerLabel}
          emptyLabel="Final translations appear here as you speak."
        />
      </div>

      {error && <div className="translate-tool__error">{error}</div>}

      <div className="tr-runner__controls">
        <div className="tr-runner__role-toggle">
          <button
            type="button"
            className={`tr-runner__role-btn${nextRole === "speaker" ? " is-active" : ""}`}
            onClick={() => setNextRole("speaker")}
          >
            Speaker
          </button>
          <button
            type="button"
            className={`tr-runner__role-btn${nextRole === "you" ? " is-active" : ""}`}
            onClick={() => setNextRole("you")}
          >
            You
          </button>
        </div>
        <p className="tr-form__hint">
          Next caption is labelled {nextRole === "you" ? "YOU" : "SPEAKER"}.
        </p>

        {!listening ? (
          <button type="button" className="translate-tool__btn" onClick={() => void start()}>
            Start listening
          </button>
        ) : (
          <button type="button" className="tr-runner__stop-btn" onClick={finish}>
            Stop &amp; summarize
          </button>
        )}
      </div>
    </div>
  );
}
