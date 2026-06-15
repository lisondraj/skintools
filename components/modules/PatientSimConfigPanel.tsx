"use client";

import type { PatientSimConfig, Slide } from "@/lib/modules/types";
import { getSimTimeLimitMinutes } from "@/lib/modules/realtime";

const DIFFICULTIES: { id: PatientSimConfig["difficulty"]; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "Cooperative, clear answers" },
  { id: "moderate", label: "Moderate", hint: "Some anxiety, follow-ups" },
  { id: "challenging", label: "Challenging", hint: "Emotional, vague symptoms" },
];

const TIME_LIMITS = [3, 5, 7, 10, 15] as const;

type Props = {
  sim?: PatientSimConfig;
  onChange: (sim: Partial<PatientSimConfig>) => void;
};

export function PatientSimConfigPanel({ sim, onChange }: Props) {
  const config = sim ?? {
    persona: "",
    scenario: "",
    difficulty: "moderate" as const,
    timeLimitMinutes: 5,
  };

  const timeLimit = getSimTimeLimitMinutes(config);

  return (
    <div className="vsp-config">
      <header className="vsp-config__header">
        <div className="vsp-config__icon" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <path d="M12 18v4M8 22h8" />
          </svg>
        </div>
        <div>
          <h2 className="vsp-config__title">Virtual patient</h2>
          <p className="vsp-config__lead">
            Learners speak with this AI patient in real time. Mic is push-to-talk — unmute only when speaking.
          </p>
        </div>
      </header>

      <label className="modules-field">
        <span className="modules-field__label">Persona</span>
        <textarea
          className="modules-field__input"
          rows={2}
          placeholder="Who is this patient? Age, temperament, concerns…"
          value={config.persona}
          onChange={(e) => onChange({ persona: e.target.value })}
        />
      </label>

      <label className="modules-field">
        <span className="modules-field__label">Scenario</span>
        <textarea
          className="modules-field__input"
          rows={3}
          placeholder="What brings them in? What do they want to know?"
          value={config.scenario}
          onChange={(e) => onChange({ scenario: e.target.value })}
        />
      </label>

      <div className="modules-field">
        <span className="modules-field__label">Difficulty</span>
        <div className="vsp-config__difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`vsp-config__diff-btn${config.difficulty === d.id ? " is-active" : ""}`}
              onClick={() => onChange({ difficulty: d.id })}
            >
              <span className="vsp-config__diff-label">{d.label}</span>
              <span className="vsp-config__diff-hint">{d.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="modules-field">
        <span className="modules-field__label">Time limit ({timeLimit} min)</span>
        <div className="vsp-config__difficulty">
          {TIME_LIMITS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`vsp-config__diff-btn${timeLimit === minutes ? " is-active" : ""}`}
              onClick={() => onChange({ timeLimitMinutes: minutes })}
            >
              <span className="vsp-config__diff-label">{minutes} min</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PatientSimSlidePreview({
  slide,
  presentMode = false,
}: {
  slide: Slide;
  presentMode?: boolean;
}) {
  const sim = slide.sim;
  const difficulty = DIFFICULTIES.find((d) => d.id === sim?.difficulty);
  const minutes = getSimTimeLimitMinutes(sim ?? { persona: "", scenario: "", difficulty: "moderate" });

  return (
    <div className={`vsp-preview${presentMode ? " vsp-preview--present" : ""}`}>
      <div className="vsp-preview__visual" aria-hidden>
        <span className="vsp-preview__orb-ring" />
        <span className="vsp-preview__orb-core" />
      </div>
      <span className="vsp-preview__badge">Virtual patient</span>
      <h3 className="vsp-preview__title">{sim?.persona || "Patient persona not set"}</h3>
      <p className="vsp-preview__scenario">{sim?.scenario || "Add a scenario in the editor."}</p>
      <div className="vsp-preview__tags">
        {difficulty && <span className="vsp-preview__tag">{difficulty.label}</span>}
        <span className="vsp-preview__tag">{minutes} min</span>
        <span className="vsp-preview__tag">Push-to-talk</span>
      </div>
    </div>
  );
}
