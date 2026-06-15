"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Conversation } from "@/components/translate/Conversation";
import { SessionRunner } from "@/components/translate/SessionRunner";
import {
  collectDetectedLanguages,
  formatDuration,
  saveSession,
} from "@/lib/translate/storage";
import {
  DEFAULT_TARGET_LANG,
  LANGUAGES,
  type TranslateConfig,
  type TranslateSession,
  type TranslateTurn,
} from "@/lib/translate/types";

type Phase = "setup" | "live" | "done";

export default function TranslateSessionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<TranslateConfig>({
    targetLang: DEFAULT_TARGET_LANG.code,
    targetLangLabel: DEFAULT_TARGET_LANG.label,
    speakerLabel: "Speaker",
  });
  const [savedSession, setSavedSession] = useState<TranslateSession | null>(null);

  function handleLanguageChange(code: string) {
    const lang = LANGUAGES.find((item) => item.code === code) ?? DEFAULT_TARGET_LANG;
    setConfig((prev) => ({
      ...prev,
      targetLang: lang.code,
      targetLangLabel: lang.label,
    }));
  }

  function handleStart() {
    setSavedSession(null);
    setPhase("live");
  }

  function handleComplete(result: { turns: TranslateTurn[]; durationSec: number }) {
    const session: TranslateSession = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      config,
      durationSec: result.durationSec,
      turns: result.turns,
    };
    saveSession(session);
    setSavedSession(session);
    setPhase("done");
  }

  const detectedLangs = savedSession ? collectDetectedLanguages(savedSession.turns) : [];

  return (
    <div className="translate-tool__inner">
      <header className="translate-tool__header">
        <Link href="/translate" className="translate-tool__logo">
          Live Translate
        </Link>
      </header>

      <main className="translate-tool__section">
        {phase === "setup" && (
          <>
            <h1 className="translate-tool__title translate-tool__title--sm">New session</h1>
            <p className="translate-tool__lead translate-tool__lead--tight">
              Pick the language you want everything translated into. Source language
              is detected automatically.
            </p>

            <form
              className="tr-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleStart();
              }}
            >
              <div className="tr-form__field">
                <label className="tr-form__label" htmlFor="targetLang">
                  Translate into
                </label>
                <select
                  id="targetLang"
                  className="tr-form__select"
                  value={config.targetLang}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tr-form__field">
                <label className="tr-form__label" htmlFor="speakerLabel">
                  Speaker label
                </label>
                <input
                  id="speakerLabel"
                  className="tr-form__input"
                  value={config.speakerLabel ?? ""}
                  onChange={(event) =>
                    setConfig((prev) => ({ ...prev, speakerLabel: event.target.value }))
                  }
                  placeholder="Speaker"
                />
                <span className="tr-form__hint">
                  Shown above the other person&apos;s captions (default: SPEAKER).
                </span>
              </div>

              <div className="translate-tool__actions">
                <button type="submit" className="translate-tool__btn">
                  Start listening
                </button>
                <Link href="/translate" className="translate-tool__btn translate-tool__btn--secondary">
                  Cancel
                </Link>
              </div>
            </form>
          </>
        )}

        {phase === "live" && (
          <>
            <h1 className="translate-tool__title translate-tool__title--sm">Live session</h1>
            <p className="translate-tool__lead translate-tool__lead--tight">
              Translating into {config.targetLangLabel}.
            </p>
            <SessionRunner config={config} autoStart onComplete={handleComplete} />
          </>
        )}

        {phase === "done" && savedSession && (
          <>
            <h1 className="translate-tool__title translate-tool__title--sm">Session saved</h1>

            <div className="tr-summary">
              <span className="tr-summary__item">
                <strong>{formatDuration(savedSession.durationSec)}</strong>
              </span>
              <span className="tr-summary__item">
                <strong>{savedSession.turns.length}</strong> turn
                {savedSession.turns.length === 1 ? "" : "s"}
              </span>
              <span className="tr-summary__item">
                → <strong>{savedSession.config.targetLangLabel}</strong>
              </span>
              {detectedLangs.length > 0 && (
                <span className="tr-summary__item">
                  Detected: <strong>{detectedLangs.join(", ")}</strong>
                </span>
              )}
            </div>

            <Conversation turns={savedSession.turns} speakerLabel={savedSession.config.speakerLabel} />

            <div className="translate-tool__actions">
              <Link href="/translate/history" className="translate-tool__btn">
                View history
              </Link>
              <button
                type="button"
                className="translate-tool__btn translate-tool__btn--secondary"
                onClick={() => {
                  setPhase("setup");
                  setSavedSession(null);
                }}
              >
                New session
              </button>
              <button
                type="button"
                className="translate-tool__btn translate-tool__btn--ghost"
                onClick={() => router.push("/translate")}
              >
                Back to home
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
