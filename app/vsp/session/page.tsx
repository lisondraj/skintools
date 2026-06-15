"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SessionRunner } from "@/components/vsp/SessionRunner";
import { Transcript } from "@/components/vsp/Transcript";
import { DEFAULT_PATIENT_SIM } from "@/lib/modules/types";
import { formatDuration, saveSession } from "@/lib/vsp/storage";
import type { VspConfig, VspSession, VspTurn } from "@/lib/vsp/types";

type Phase = "setup" | "live" | "done";

const DIFFICULTY_OPTIONS: Array<{ value: VspConfig["difficulty"]; label: string }> = [
  { value: "easy", label: "Easy — cooperative" },
  { value: "moderate", label: "Moderate — mildly anxious" },
  { value: "challenging", label: "Challenging — more anxious" },
];

export default function VspSessionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<VspConfig>({ ...DEFAULT_PATIENT_SIM });
  const [savedSession, setSavedSession] = useState<VspSession | null>(null);

  function updateConfig<K extends keyof VspConfig>(key: K, value: VspConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function handleStart() {
    if (!config.persona.trim() || !config.scenario.trim()) return;
    setSavedSession(null);
    setPhase("live");
  }

  function handleComplete(result: { transcript: VspTurn[]; durationSec: number }) {
    const session: VspSession = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      config,
      durationSec: result.durationSec,
      transcript: result.transcript,
    };
    saveSession(session);
    setSavedSession(session);
    setPhase("done");
  }

  return (
    <div className="vsp-tool__inner">
      <header className="vsp-tool__header">
        <Link href="/vsp" className="vsp-tool__logo">
          Virtual Patient
        </Link>
      </header>

      <main className="vsp-tool__section">
        {phase === "setup" && (
          <>
            <h1 className="vsp-tool__title vsp-tool__title--sm">New session</h1>
            <p className="vsp-tool__lead vsp-tool__lead--tight">
              Configure the patient, then start the voice encounter.
            </p>

            <form
              className="vsp-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleStart();
              }}
            >
              <div className="vsp-form__field">
                <label className="vsp-form__label" htmlFor="persona">
                  Persona
                </label>
                <input
                  id="persona"
                  className="vsp-form__input"
                  value={config.persona}
                  onChange={(event) => updateConfig("persona", event.target.value)}
                  required
                />
              </div>

              <div className="vsp-form__field">
                <label className="vsp-form__label" htmlFor="scenario">
                  Scenario
                </label>
                <textarea
                  id="scenario"
                  className="vsp-form__textarea"
                  value={config.scenario}
                  onChange={(event) => updateConfig("scenario", event.target.value)}
                  required
                />
              </div>

              <div className="vsp-form__field">
                <label className="vsp-form__label" htmlFor="difficulty">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  className="vsp-form__select"
                  value={config.difficulty}
                  onChange={(event) =>
                    updateConfig("difficulty", event.target.value as VspConfig["difficulty"])
                  }
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vsp-form__field">
                <label className="vsp-form__label" htmlFor="timeLimit">
                  Time limit (minutes)
                </label>
                <input
                  id="timeLimit"
                  type="number"
                  min={2}
                  max={20}
                  className="vsp-form__input"
                  value={config.timeLimitMinutes ?? 5}
                  onChange={(event) =>
                    updateConfig("timeLimitMinutes", Number(event.target.value))
                  }
                />
                <span className="vsp-form__hint">Between 2 and 20 minutes.</span>
              </div>

              <div className="vsp-tool__actions">
                <button type="submit" className="vsp-tool__btn">
                  Start encounter
                </button>
                <Link href="/vsp" className="vsp-tool__btn vsp-tool__btn--secondary">
                  Cancel
                </Link>
              </div>
            </form>
          </>
        )}

        {phase === "live" && (
          <>
            <h1 className="vsp-tool__title vsp-tool__title--sm">Live encounter</h1>
            <SessionRunner config={config} autoStart onComplete={handleComplete} />
          </>
        )}

        {phase === "done" && savedSession && (
          <>
            <h1 className="vsp-tool__title vsp-tool__title--sm">Session saved</h1>
            <p className="vsp-tool__lead vsp-tool__lead--tight">
              {formatDuration(savedSession.durationSec)} · {savedSession.transcript.length}{" "}
              turn{savedSession.transcript.length === 1 ? "" : "s"}
            </p>

            <Transcript turns={savedSession.transcript} />

            <div className="vsp-tool__actions">
              <Link href="/vsp/history" className="vsp-tool__btn">
                View history
              </Link>
              <button
                type="button"
                className="vsp-tool__btn vsp-tool__btn--secondary"
                onClick={() => {
                  setPhase("setup");
                  setSavedSession(null);
                }}
              >
                New session
              </button>
              <button
                type="button"
                className="vsp-tool__btn vsp-tool__btn--ghost"
                onClick={() => router.push("/vsp")}
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
