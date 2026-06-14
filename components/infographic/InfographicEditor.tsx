"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import type { InfographicDesign, InfographicQualityMode } from "@/lib/infographic/types";
import { editDesignImage } from "@/lib/infographic/client";
import { PRESET_GROUPS } from "@/lib/infographic/presets";

type Props = {
  design: InfographicDesign;
  qualityMode: InfographicQualityMode;
  onBack: () => void;
};

export function InfographicEditor({ design, qualityMode: initialQuality, onBack }: Props) {
  const [image, setImage] = useState(design.image);
  const [history, setHistory] = useState<string[]>([design.image]);
  const [prompt, setPrompt] = useState("");
  const [qualityMode, setQualityMode] = useState<InfographicQualityMode>(initialQuality);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exportMsg, setExportMsg] = useState("");

  const canUndo = history.length > 1;

  const runEdit = useCallback(
    async (editPrompt: string) => {
      if (!editPrompt.trim() || busy) return;
      setBusy(true);
      setError("");
      try {
        const next = await editDesignImage(image, editPrompt.trim(), qualityMode);
        setImage(next);
        setHistory((h) => [...h, next]);
        setPrompt("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Edit failed.");
      } finally {
        setBusy(false);
      }
    },
    [busy, image, qualityMode],
  );

  function handleApply() {
    runEdit(prompt);
  }

  function handleUndo() {
    if (!canUndo) return;
    setHistory((h) => {
      const next = h.slice(0, -1);
      setImage(next[next.length - 1] ?? design.image);
      return next;
    });
    setError("");
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.download = `infographic-${design.variant.toLowerCase()}.png`;
    a.href = image;
    a.click();
    setExportMsg("Saved!");
    setTimeout(() => setExportMsg(""), 2500);
  }

  return (
    <div className="ig-editor">
      <header className="ig-editor__header">
        <Link href="/infographic" className="ig-editor__logo">
          Infographic Builder
        </Link>
        <span className="ig-editor__badge">Style {design.variant}</span>
      </header>

      <div className="ig-editor__toolbar">
        <div className="ig-editor__toolbar-group">
          <button
            type="button"
            className="ig-editor__btn ig-editor__btn--secondary"
            onClick={onBack}
            disabled={busy}
          >
            Back
          </button>
          <button
            type="button"
            className="ig-editor__btn ig-editor__btn--secondary"
            onClick={handleUndo}
            disabled={!canUndo || busy}
          >
            Undo
          </button>
        </div>
        <div className="ig-editor__toolbar-group">
          {exportMsg && <span className="ig-editor__msg">{exportMsg}</span>}
          <button
            type="button"
            className="ig-editor__btn ig-editor__btn--primary"
            onClick={handleDownload}
            disabled={busy}
          >
            Download PNG
          </button>
        </div>
      </div>

      <div className="ig-editor__preview">
        <div className="ig-editor__image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={`Infographic style ${design.variant}`}
            className="ig-editor__image"
          />
          {busy && (
            <div className="ig-editor__busy" aria-live="polite">
              <span className="skinlog__spinner" />
              Applying edit…
            </div>
          )}
        </div>
      </div>

      <div className="ig-editor__panel">
        {error && <div className="ig-editor__error">{error}</div>}

        <label className="ig-editor__prompt-label" htmlFor="ig-edit-prompt">
          Describe your edit
        </label>
        <div className="ig-editor__prompt-row">
          <textarea
            id="ig-edit-prompt"
            className="ig-editor__prompt"
            placeholder="e.g. make the title larger, simplify the footer, add icons…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={busy}
            rows={2}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleApply();
              }
            }}
          />
          <button
            type="button"
            className="ig-editor__btn ig-editor__btn--primary ig-editor__apply"
            onClick={handleApply}
            disabled={busy || !prompt.trim()}
          >
            {busy ? (
              <>
                <span className="skinlog__spinner" />
                Applying…
              </>
            ) : (
              "Apply"
            )}
          </button>
        </div>

        {PRESET_GROUPS.map((group) => (
          <div key={group.id} className="ig-editor__preset-group">
            <span className="ig-editor__preset-label">{group.label}</span>
            <div className="ig-editor__presets">
              {group.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="ig-editor__preset"
                  onClick={() => runEdit(preset.prompt)}
                  disabled={busy}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="ig-editor__preset-group">
          <span className="ig-editor__preset-label">Edit speed</span>
          <div className="ig-editor__presets">
            <button
              type="button"
              className={`ig-editor__preset${qualityMode === "fast" ? " is-active" : ""}`}
              onClick={() => setQualityMode("fast")}
              disabled={busy}
            >
              Fast
            </button>
            <button
              type="button"
              className={`ig-editor__preset${qualityMode === "standard" ? " is-active" : ""}`}
              onClick={() => setQualityMode("standard")}
              disabled={busy}
            >
              Standard
            </button>
          </div>
        </div>

        <p className="ig-editor__hint">⌘↵ to apply · Undo reverts the last edit</p>
      </div>
    </div>
  );
}
