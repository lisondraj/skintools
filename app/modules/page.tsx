"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SlideCanvas } from "@/components/modules/SlideCanvas";
import { SlideThumbnails } from "@/components/modules/SlideThumbnails";
import { ImageLibrary } from "@/components/modules/ImageLibrary";
import { PresentMode } from "@/components/modules/PresentMode";
import { autofillText } from "@/lib/modules/client";
import {
  createImageElement,
  createTextElement,
} from "@/lib/modules/elements";
import {
  addSlide,
  deleteSlide,
  getDeck,
  hydrateDeck,
  nextElementZ,
  onStorageError,
  updateDeckTitle,
  updateSimConfig,
  updateSlide,
} from "@/lib/modules/storage";
import type { AutofillMode, Deck, SlideElement } from "@/lib/modules/types";

export default function ModulesPage() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [autofillBusy, setAutofillBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void hydrateDeck().then((d) => setDeck(d));
    return onStorageError((msg) => setError(msg));
  }, []);

  const activeSlide = deck?.slides[activeIndex];

  const refreshDeck = useCallback(() => setDeck(getDeck()), []);

  const updateElements = useCallback(
    (elements: SlideElement[]) => {
      if (!deck || !activeSlide) return;
      updateSlide(activeSlide.id, (slide) => ({ ...slide, elements }));
      refreshDeck();
    },
    [activeSlide, deck, refreshDeck],
  );

  function handleAddText() {
    if (!activeSlide || activeSlide.kind !== "content") return;
    const el = createTextElement(undefined, nextElementZ(activeSlide.elements));
    updateElements([...activeSlide.elements, el]);
    setSelectedElementId(el.id);
  }

  function handleAddImage(src: string) {
    if (!activeSlide || activeSlide.kind !== "content") return;
    const el = createImageElement(src, nextElementZ(activeSlide.elements));
    updateElements([...activeSlide.elements, el]);
    setSelectedElementId(el.id);
  }

  async function handleAutofill(mode: AutofillMode, prompt?: string) {
    if (!deck || !activeSlide || activeSlide.kind !== "content") return;
    const selected = activeSlide.elements.find((el) => el.id === selectedElementId);
    setAutofillBusy(true);
    setError("");
    try {
      const text = await autofillText({
        mode,
        prompt,
        existingText: selected?.kind === "text" ? selected.text : undefined,
        deckTitle: deck.title,
        slideContext: `Slide ${activeIndex + 1}`,
      });
      if (mode === "generate") {
        const el = createTextElement(text, nextElementZ(activeSlide.elements));
        updateElements([...activeSlide.elements, el]);
        setSelectedElementId(el.id);
      } else if (selected?.kind === "text") {
        updateElements(
          activeSlide.elements.map((el) =>
            el.id === selected.id && el.kind === "text" ? { ...el, text } : el,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Autofill failed.");
    } finally {
      setAutofillBusy(false);
    }
  }

  if (presenting && deck) {
    return <PresentMode deck={deck} onExit={() => setPresenting(false)} />;
  }

  if (!deck || !activeSlide) {
    return (
      <div className="modules__loading">
        <span className="modules-spinner" />
        Loading…
      </div>
    );
  }

  const selectedEl = activeSlide.elements.find((el) => el.id === selectedElementId);
  const isContent = activeSlide.kind === "content";
  const selectedIsText = selectedEl?.kind === "text";

  return (
    <div className="modules__app">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="modules__topbar">
        <div className="modules__topbar-left">
          <Link href="/" className="modules__home-link" aria-label="Back to home">
            ←
          </Link>
          <span className="modules__divider" aria-hidden />
          <input
            className="modules__title-input"
            value={deck.title}
            onChange={(e) => {
              const next = updateDeckTitle(e.target.value);
              if (next) setDeck(next);
            }}
            aria-label="Presentation title"
          />
        </div>

        <nav className="modules__topbar-actions" aria-label="Slide tools">
          {isContent && (
            <>
              <button type="button" className="modules-action-btn" onClick={handleAddText}>
                Text
              </button>
              <button type="button" className="modules-action-btn" onClick={() => setLibraryOpen(true)}>
                Image
              </button>
              <span className="modules__divider" aria-hidden />
              <button
                type="button"
                className="modules-action-btn"
                disabled={autofillBusy}
                onClick={() => {
                  const prompt = window.prompt("What should this text box say?");
                  if (prompt?.trim()) void handleAutofill("generate", prompt.trim());
                }}
              >
                {autofillBusy ? "Working…" : "AI Generate"}
              </button>
              {selectedIsText && (
                <>
                  <button type="button" className="modules-action-btn" disabled={autofillBusy} onClick={() => void handleAutofill("rewrite")}>Rewrite</button>
                  <button type="button" className="modules-action-btn" disabled={autofillBusy} onClick={() => void handleAutofill("expand")}>Expand</button>
                  <button type="button" className="modules-action-btn" disabled={autofillBusy} onClick={() => void handleAutofill("shorten")}>Shorten</button>
                </>
              )}
              <span className="modules__divider" aria-hidden />
            </>
          )}
          <button
            type="button"
            className="modules-action-btn modules-action-btn--primary"
            onClick={() => setPresenting(true)}
          >
            Present
          </button>
        </nav>
      </header>

      {error && (
        <div className="modules-error" role="alert">
          {error}
          <button type="button" className="modules-error__dismiss" onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* ── Workspace ───────────────────────────────────────────── */}
      <div className="modules__workspace">
        <SlideThumbnails
          slides={deck.slides}
          activeIndex={activeIndex}
          onSelect={(i) => { setActiveIndex(i); setSelectedElementId(null); }}
          onAdd={(kind) => {
            const next = addSlide(kind);
            if (next) {
              setDeck(next);
              setActiveIndex(next.slides.length - 1);
              setSelectedElementId(null);
            }
          }}
          onDelete={(index) => {
            const slide = deck.slides[index];
            const next = deleteSlide(slide.id);
            if (next) {
              setDeck(next);
              setActiveIndex(Math.min(index, next.slides.length - 1));
            }
          }}
        />

        <main className="modules__canvas-area">
          <SlideCanvas
            slide={activeSlide}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onChangeElements={updateElements}
            onChangeSim={(sim) => {
              const next = updateSimConfig(activeSlide.id, sim);
              if (next) setDeck(next);
            }}
          />
        </main>
      </div>

      <ImageLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelectImage={handleAddImage}
      />
    </div>
  );
}
