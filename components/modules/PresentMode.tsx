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
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
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
            onEnd={() => {
              setSimActive(false);
              goNext();
            }}
          />
        );
      }
      return (
        <div className="modules-present__sim">
          <PatientSimSlidePreview slide={current} />
          <button
            type="button"
            className="modules-btn modules-btn--primary"
            onClick={() => setSimActive(true)}
          >
            Start patient conversation
          </button>
        </div>
      );
    }

    return (
      <SlideCanvas
        slide={current}
        selectedElementId={null}
        onSelectElement={() => {}}
        onChangeElements={() => {}}
        readOnly
      />
    );
  }

  return (
    <div className="modules-present">
      <header className="modules-present__bar">
        <span>
          Slide {index + 1} / {deck.slides.length}
        </span>
        <button type="button" className="modules-btn modules-btn--ghost" onClick={onExit}>
          Exit
        </button>
      </header>

      <div className="modules-present__stage">{renderSlideContent(slide)}</div>

      {!simActive && (
        <footer className="modules-present__nav">
          <button
            type="button"
            className="modules-btn modules-btn--secondary"
            onClick={goPrev}
            disabled={index === 0}
          >
            Previous
          </button>
          <button
            type="button"
            className="modules-btn"
            onClick={goNext}
            disabled={index >= deck.slides.length - 1}
          >
            Next
          </button>
        </footer>
      )}
    </div>
  );
}
