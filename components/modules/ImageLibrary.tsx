"use client";

import { useEffect, useRef, useState } from "react";
import { generateSlideImage } from "@/lib/modules/client";
import { hydrateAlbums, getAlbums } from "@/lib/remorph/storage";
import { hydrateHistory, getHistory } from "@/lib/infographic/storage";
import { readFileAsDataUrl } from "@/lib/remorph/image-utils";
import { streamDesignImage } from "@/lib/infographic/client";
import type { RemorphAlbum } from "@/lib/remorph/types";
import type { InfographicHistoryEntry } from "@/lib/infographic/storage";
import type { InfographicContent } from "@/lib/infographic/types";

type Tab = "upload" | "generate" | "remorph" | "infographic";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectImage: (src: string) => void;
};

export function ImageLibrary({ open, onClose, onSelectImage }: Props) {
  const [tab, setTab] = useState<Tab>("upload");
  const [albums, setAlbums] = useState<RemorphAlbum[]>([]);
  const [infographicHistory, setInfographicHistory] = useState<InfographicHistoryEntry[]>([]);
  const [prompt, setPrompt] = useState("");
  const [qualityMode, setQualityMode] = useState<"fast" | "quality">("fast");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [infoDiagnosis, setInfoDiagnosis] = useState("");
  const [infoGenerating, setInfoGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    void hydrateAlbums().then(() => setAlbums(getAlbums()));
    void hydrateHistory().then(() => setInfographicHistory(getHistory()));
    setPreview("");
    setError("");
  }, [open]);

  if (!open) return null;

  async function handleUpload(file: File) {
    const src = await readFileAsDataUrl(file);
    onSelectImage(src);
    onClose();
  }

  async function handleGenerateImage() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    setPreview("");
    try {
      const image = await generateSlideImage({
        prompt: prompt.trim(),
        purpose: tab === "generate" ? "image" : "image",
        qualityMode,
      });
      setPreview(image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateInfographic() {
    if (!infoDiagnosis.trim()) return;
    setInfoGenerating(true);
    setError("");
    setPreview("");
    try {
      const genRes = await fetch("/api/infographic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosis: infoDiagnosis.trim(), language: "en" }),
      });
      const genData = (await genRes.json()) as { content?: InfographicContent; error?: string };
      if (!genRes.ok || !genData.content) {
        throw new Error(genData.error || "Could not generate infographic content.");
      }

      const image = await streamDesignImage("A", genData.content, "en", "fast");
      setPreview(image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Infographic generation failed.");
    } finally {
      setInfoGenerating(false);
    }
  }

  const busy = generating || infoGenerating;

  return (
    <div className="modules-modal" role="dialog" aria-modal="true" aria-label="Image library">
      <div className="modules-modal__backdrop" onClick={onClose} />
      <div className="modules-modal__panel modules-modal__panel--wide">
        <header className="modules-modal__header">
          <h2>Add image</h2>
          <button type="button" className="modules-btn modules-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="modules-modal__tabs">
          {(
            [
              ["upload", "Upload"],
              ["generate", "AI generate"],
              ["remorph", "Remorph"],
              ["infographic", "Infographic"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`modules-modal__tab${tab === id ? " is-active" : ""}`}
              onClick={() => {
                setTab(id);
                setPreview("");
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <div className="modules-modal__error">{error}</div>}

        {tab === "upload" && (
          <div className="modules-modal__section">
            <button
              type="button"
              className="modules-btn modules-btn--primary"
              onClick={() => fileRef.current?.click()}
            >
              Upload image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {tab === "generate" && (
          <div className="modules-modal__section">
            <p className="modules-modal__hint">
              Generate slide images with GPT Image 2 — illustrations, diagrams, or clinical visuals.
            </p>
            <label className="modules-field">
              <span className="modules-field__label">Prompt</span>
              <textarea
                className="modules-field__input"
                rows={3}
                placeholder="e.g. Cross-section diagram of skin layers showing epidermis and dermis…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <div className="modules-modal__quality-row">
              <span className="modules-field__label">Quality</span>
              <button
                type="button"
                className={`modules-btn modules-btn--secondary${qualityMode === "fast" ? " is-active" : ""}`}
                onClick={() => setQualityMode("fast")}
              >
                Fast
              </button>
              <button
                type="button"
                className={`modules-btn modules-btn--secondary${qualityMode === "quality" ? " is-active" : ""}`}
                onClick={() => setQualityMode("quality")}
              >
                Quality
              </button>
            </div>
            <button
              type="button"
              className="modules-btn modules-btn--primary"
              disabled={busy || !prompt.trim()}
              onClick={() => void handleGenerateImage()}
            >
              {generating ? "Generating…" : "Generate image"}
            </button>
          </div>
        )}

        {tab === "remorph" && (
          <div className="modules-modal__section">
            <p className="modules-modal__hint">
              Pick from Remorph history, or generate a new image below (general GPT Image 2, not lesion-specific).
            </p>
            <label className="modules-field">
              <span className="modules-field__label">Generate new</span>
              <textarea
                className="modules-field__input"
                rows={2}
                placeholder="Describe the image for your slide…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="modules-btn modules-btn--secondary modules-modal__gen-btn"
              disabled={busy || !prompt.trim()}
              onClick={() => void handleGenerateImage()}
            >
              {generating ? "Generating…" : "Generate with GPT Image 2"}
            </button>

            <h3 className="modules-modal__subtitle">Remorph history</h3>
            {albums.length === 0 ? (
              <p className="modules-modal__empty">No Remorph images yet.</p>
            ) : (
              <div className="modules-library-grid">
                {albums.map((album) => {
                  const step = album.steps[album.steps.length - 1];
                  if (!step) return null;
                  return (
                    <button
                      key={album.id}
                      type="button"
                      className="modules-library-item"
                      onClick={() => {
                        onSelectImage(step.image);
                        onClose();
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={step.image} alt={album.title} />
                      <span>{album.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "infographic" && (
          <div className="modules-modal__section">
            <p className="modules-modal__hint">
              Generate a new infographic or pick from history.
            </p>
            <label className="modules-field">
              <span className="modules-field__label">Diagnosis / topic</span>
              <textarea
                className="modules-field__input"
                rows={2}
                placeholder="e.g. Atopic dermatitis — triggers and management"
                value={infoDiagnosis}
                onChange={(e) => setInfoDiagnosis(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="modules-btn modules-btn--secondary modules-modal__gen-btn"
              disabled={busy || !infoDiagnosis.trim()}
              onClick={() => void handleGenerateInfographic()}
            >
              {infoGenerating ? "Generating…" : "Generate infographic"}
            </button>

            <h3 className="modules-modal__subtitle">Infographic history</h3>
            {infographicHistory.length === 0 ? (
              <p className="modules-modal__empty">No infographic history yet.</p>
            ) : (
              <div className="modules-library-grid">
                {infographicHistory.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="modules-library-item"
                    onClick={() => {
                      onSelectImage(entry.image);
                      onClose();
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.image} alt={entry.diagnosis} />
                    <span>{entry.diagnosis}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {preview && (
          <div className="modules-modal__preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Generated preview" />
            <button
              type="button"
              className="modules-btn modules-btn--primary"
              onClick={() => {
                onSelectImage(preview);
                onClose();
              }}
            >
              Add to slide
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
