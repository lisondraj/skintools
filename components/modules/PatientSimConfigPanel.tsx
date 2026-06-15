"use client";

import type { PatientSimConfig, Slide } from "@/lib/modules/types";

type Props = {
  sim?: PatientSimConfig;
  onChange: (sim: Partial<PatientSimConfig>) => void;
};

export function PatientSimConfigPanel({ sim, onChange }: Props) {
  const config = sim ?? {
    persona: "",
    scenario: "",
    difficulty: "moderate" as const,
  };

  return (
    <div className="modules-sim-config">
      <h2 className="modules-sim-config__title">Virtual patient slide</h2>
      <p className="modules-sim-config__lead">
        Configure the AI patient persona. During presentation, learners will speak
        with this patient in real time using voice.
      </p>

      <label className="modules-field">
        <span className="modules-field__label">Persona</span>
        <textarea
          className="modules-field__input"
          rows={2}
          value={config.persona}
          onChange={(e) => onChange({ persona: e.target.value })}
        />
      </label>

      <label className="modules-field">
        <span className="modules-field__label">Scenario</span>
        <textarea
          className="modules-field__input"
          rows={3}
          value={config.scenario}
          onChange={(e) => onChange({ scenario: e.target.value })}
        />
      </label>

      <label className="modules-field">
        <span className="modules-field__label">Difficulty</span>
        <select
          className="modules-field__input"
          value={config.difficulty}
          onChange={(e) =>
            onChange({
              difficulty: e.target.value as PatientSimConfig["difficulty"],
            })
          }
        >
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="challenging">Challenging</option>
        </select>
      </label>
    </div>
  );
}

export function PatientSimSlidePreview({ slide }: { slide: Slide }) {
  const sim = slide.sim;
  return (
    <div className="modules-sim-preview">
      <div className="modules-sim-preview__icon" aria-hidden>
        🎙
      </div>
      <h3>Virtual patient simulation</h3>
      <p>{sim?.persona || "Patient persona not set"}</p>
      <p className="modules-sim-preview__meta">
        Difficulty: {sim?.difficulty || "moderate"}
      </p>
    </div>
  );
}
