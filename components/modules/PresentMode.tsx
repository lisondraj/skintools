"use client";

import { useCallback, useEffect, useState } from "react";
import type { Deck, Slide } from "@/lib/modules/types";
import { SlideCanvas } from "./SlideCanvas";
import { PatientSimRunner } from "./PatientSimRunner";
import { PatientSimSlidePreview } from "./PatientSimConfigPanel";

type Props = {
  deck: Deck;
  startIndex?: number;
  onExit: () => void;
};

export function PresentMode({ deck, startIndex = 0, onExit }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [simActive, setSimActive] = useState(false);
  const slide = deck.slides[index];
  const progress = ((index + 1) / deck.slides.length) * 100;

  const goNext = useCallback(() => {
    setSimActive(false);
    setIndex((i) => Math.min(i + 1, deck.slides.length - 1));
  }, [deck.slides.length]);

  const goPrev = useCallback(() => {
    setSimActive(false);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onExit();
      if (simActive) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onExit, simActive]);

  function renderSlideContent(current: Slide) {
    if (current.kind === "patient-sim") {
      if (simActive && current.sim) {
        return (
          <PatientSimRunner
            sim={current.sim}
            autoStart
            presentMode
            onEnd={() => {
              setSimActive(false);
              goNext();
            }}
          />
        );
      }
      return (
        <div className="modules-present__sim-card">
          <PatientSimSlidePreview slide={current} presentMode />
          <div className="modules-present__sim-actions">
            <button
              type="button"
              className="modules-present__start-btn"
              onClick={() => setSimActive(true)}
            >
              Start patient conversation
            </button>
            <p className="modules-present__sim-tip">
              Push-to-talk · Unmute only when speaking
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="modules-present__slide-frame">
        <SlideCanvas
          slide={current}
          selectedElementId={null}
          onSelectElement={() => {}}
          onChangeElements={() => {}}
          readOnly
        />
      </div>
    );
  }

  return (
    <div className="modules-present">
      <div
        className="modules-present__progress"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={deck.slides.length}
        aria-label="Presentation progress"
      >
        <span className="modules-present__progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <header className="modules-present__bar">
        <div className="modules-present__bar-left">
          <span className="modules-present__deck-title">{deck.title}</span>
          <span className="modules-present__slide-count">
            {index + 1} / {deck.slides.length}
          </span>
          {slide.kind === "patient-sim" && (
            <span className="modules-present__type-badge">Virtual patient</span>
          )}
        </div>
        <div className="modules-present__bar-right">
          {!simActive && (
            <span className="modules-present__kbd-hint">← → navigate · Esc exit</span>
          )}
          <button type="button" className="modules-present__exit-btn" onClick={onExit}>
            Exit
          </button>
        </div>
      </header>

      <div className="modules-present__stage">
        <div className="modules-present__stage-inner">{renderSlideContent(slide)}</div>
      </div>

      {!simActive && (
        <footer className="modules-present__nav">
          <button
            type="button"
            className="modules-present__nav-btn"
            onClick={goPrev}
            disabled={index === 0}
            aria-label="Previous slide"
          >
            ← Previous
          </button>
          <div className="modules-present__dots" aria-hidden>
            {deck.slides.map((s, i) => (
              <span
                key={s.id}
                className={`modules-present__dot${i === index ? " is-active" : ""}${s.kind === "patient-sim" ? " is-sim" : ""}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="modules-present__nav-btn modules-present__nav-btn--next"
            onClick={goNext}
            disabled={index >= deck.slides.length - 1}
            aria-label="Next slide"
          >
            Next →
          </button>
        </footer>
      )}
    </div>
  );
}
