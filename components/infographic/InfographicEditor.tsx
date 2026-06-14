"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import type { InfographicDesign } from "@/lib/infographic/types";
import { PRESET_GROUPS } from "@/lib/infographic/presets";

type Props = {
  design: InfographicDesign;
  onBack: () => void;
};

export function InfographicEditor({ design, onBack }: Props) {
  const [image, setImage] = useState(design.image);
  const [history, setHistory] = useState<string[]>([design.image]);
  const [prompt, setPrompt] = useState("");
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
        const res = await fetch("/api/infographic/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image, prompt: editPrompt.trim() }),
        });
        const data = (await res.json()) as { image?: string; error?: string };
        if (!res.ok || data.error) {
          setError(data.error ?? "Edit failed.");
          return;
        }
        const next = data.image!;
        setImage(next);
        setHistory((h) => [...h, next]);
        setPrompt("");
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, image],
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
      <header className="skinlog__header">
        <Link href="/infographic" className="skinlog__logo">
          Infographic Builder
        </Link>
      </header>

      <div className="ig-editor__bar">
        <button
          type="button"
          className="skinlog__btn skinlog__btn--secondary"
          onClick={onBack}
          disabled={busy}
        >
          Back
        </button>
        <button
          type="button"
          className="skinlog__btn skinlog__btn--secondary"
          onClick={handleUndo}
          disabled={!canUndo || busy}
        >
          Undo
        </button>
        {exportMsg && <span className="ig-editor__msg">{exportMsg}</span>}
        <button
          type="button"
          className="skinlog__btn"
          onClick={handleDownload}
          disabled={busy}
        >
          Download PNG
        </button>
      </div>

      <div className="ig-editor__canvas">
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

      {error && <div className="skinlog__error ig-editor__error">{error}</div>}

      <div className="ig-editor__controls">
        <div className="ig-editor__prompt-row">
          <textarea
            className="ig-editor__prompt"
            placeholder="Describe changes — e.g. make the title larger, add icons, simplify the footer…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={busy}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleApply();
              }
            }}
          />
          <button
            type="button"
            className="skinlog__btn ig-editor__apply"
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

        <p className="ig-editor__hint">
          Style {design.variant} · Edit with prompts or presets · Undo to revert
        </p>
      </div>
    </div>
  );
}
