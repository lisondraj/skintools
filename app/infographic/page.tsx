"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import type {
  InfographicContent,
  InfographicDesign,
  InfographicQualityMode,
} from "@/lib/infographic/types";
import { streamDesignImage } from "@/lib/infographic/client";
import { InfographicEditor } from "@/components/infographic/InfographicEditor";
import "./infographic.css";

type Step = "input" | "generating" | "preview" | "editor";

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "French", "Mandarin", "Arabic",
  "Portuguese", "Tagalog", "Vietnamese", "Korean", "Hindi",
];

export default function InfographicPage() {
  const [step, setStep] = useState<Step>("input");
  const [diagnosis, setDiagnosis] = useState("");
  const [instructions, setInstructions] = useState("");
  const [language, setLanguage] = useState("English");
  const [customLang, setCustomLang] = useState("");
  const [qualityMode, setQualityMode] = useState<InfographicQualityMode>("fast");
  const [error, setError] = useState("");
  const [filling, setFilling] = useState(false);

  const [content, setContent] = useState<InfographicContent | null>(null);
  const [designA, setDesignA] = useState<InfographicDesign | null>(null);
  const [designB, setDesignB] = useState<InfographicDesign | null>(null);
  const [previewA, setPreviewA] = useState<string | null>(null);
  const [previewB, setPreviewB] = useState<string | null>(null);
  const [doneA, setDoneA] = useState(false);
  const [doneB, setDoneB] = useState(false);
  const [activeDesign, setActiveDesign] = useState<InfographicDesign | null>(null);

  const [generatingPhase, setGeneratingPhase] = useState<
    "content" | "designs" | null
  >(null);

  const diagnosisRef = useRef<HTMLInputElement>(null);
  const lang = customLang.trim() || language;

  async function handleFillInstructions() {
    if (!diagnosis.trim()) {
      diagnosisRef.current?.focus();
      setError("Enter a diagnosis first.");
      return;
    }
    setFilling(true);
    setError("");
    try {
      const res = await fetch("/api/infographic/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosis: diagnosis.trim(), language: lang }),
      });
      const data = (await res.json()) as { instructions?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to generate instructions.");
      } else {
        setInstructions(data.instructions ?? "");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setFilling(false);
    }
  }

  async function handleGenerate() {
    if (!diagnosis.trim()) {
      diagnosisRef.current?.focus();
      setError("Diagnosis is required.");
      return;
    }
    setError("");
    setStep("generating");
    setGeneratingPhase("content");
    setPreviewA(null);
    setPreviewB(null);
    setDoneA(false);
    setDoneB(false);

    try {
      const res = await fetch("/api/infographic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: diagnosis.trim(),
          instructions: instructions.trim(),
          language: lang,
        }),
      });

      let data: { content?: InfographicContent; error?: string };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(`Server error (${res.status}). Please try again.`);
        setStep("input");
        setGeneratingPhase(null);
        return;
      }

      if (!res.ok || data.error) {
        setError(data.error ?? "Content generation failed.");
        setStep("input");
        setGeneratingPhase(null);
        return;
      }

      if (!data.content) {
        setError("No content returned. Please try again.");
        setStep("input");
        setGeneratingPhase(null);
        return;
      }

      const generatedContent = data.content;
      setContent(generatedContent);
      setGeneratingPhase("designs");
      setStep("preview");

      // Stream both variants in parallel
      const [finalA, finalB] = await Promise.all([
        streamDesignImage("A", generatedContent, lang, qualityMode, (partial) => {
          setPreviewA(partial);
        }).then((img) => {
          setPreviewA(img);
          setDoneA(true);
          return img;
        }),
        streamDesignImage("B", generatedContent, lang, qualityMode, (partial) => {
          setPreviewB(partial);
        }).then((img) => {
          setPreviewB(img);
          setDoneB(true);
          return img;
        }),
      ]);

      setDesignA({ variant: "A", image: finalA });
      setDesignB({ variant: "B", image: finalB });
      setGeneratingPhase(null);
    } catch (err) {
      console.error("[infographic] generate error:", err);
      const msg =
        err instanceof Error ? err.message : "Network error. Please try again.";
      setError(msg);
      setStep("input");
      setGeneratingPhase(null);
    }
  }

  function handleSelectDesign(design: InfographicDesign) {
    setActiveDesign(design);
    setStep("editor");
  }

  function handleBack() {
    setStep("preview");
    setActiveDesign(null);
  }

  function handleRegenerate() {
    setStep("input");
    setActiveDesign(null);
    setDesignA(null);
    setDesignB(null);
    setPreviewA(null);
    setPreviewB(null);
    setDoneA(false);
    setDoneB(false);
    setContent(null);
  }

  if (step === "editor" && activeDesign) {
    return (
      <div className="skinlog__inner ig-shell">
        <InfographicEditor
          design={activeDesign}
          qualityMode={qualityMode}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="skinlog__inner ig-shell">
      <header className="skinlog__header">
        <Link href="/infographic" className="skinlog__logo">
          Infographic Builder
        </Link>
      </header>

      <main className="skinlog__section">
        {step === "input" && (
          <>
            <h1 className="skinlog__title">Patient education, made simple.</h1>
            <p className="skinlog__lead">
              Enter a diagnosis and optional instructions. AI generates two
              complete infographics — pick one, refine with prompts, and export.
            </p>

            {error && <div className="skinlog__error">{error}</div>}

            <div className="ig-form-layout">
            <div className="ig-form">
              <div className="ig-field">
                <label className="ig-field__label" htmlFor="ig-diagnosis">
                  Diagnosis
                </label>
                <input
                  ref={diagnosisRef}
                  id="ig-diagnosis"
                  type="text"
                  className="ig-field__input"
                  placeholder="e.g. Atopic dermatitis"
                  value={diagnosis}
                  onChange={(e) => {
                    setDiagnosis(e.target.value);
                    if (error) setError("");
                  }}
                  autoFocus
                />
              </div>

              <div className="ig-field">
                <div className="ig-field__label-row">
                  <label className="ig-field__label" htmlFor="ig-instructions">
                    Instructions
                  </label>
                  <button
                    type="button"
                    className="ig-ai-fill"
                    onClick={handleFillInstructions}
                    disabled={filling}
                  >
                    {filling ? (
                      <>
                        <span className="skinlog__spinner" />
                        Filling…
                      </>
                    ) : (
                      "AI fill"
                    )}
                  </button>
                </div>
                <textarea
                  id="ig-instructions"
                  className="ig-field__textarea"
                  placeholder="Paste clinical instructions, or leave blank — AI fills in the gaps."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  disabled={filling}
                  rows={4}
                />
              </div>

              <div className="ig-field">
                <label className="ig-field__label" htmlFor="ig-language">
                  Language
                </label>
                <div className="ig-lang-row">
                  <select
                    id="ig-language"
                    className="ig-field__select"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setCustomLang("");
                    }}
                  >
                    {LANGUAGE_OPTIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                    <option value="other">Other…</option>
                  </select>
                  {language === "other" && (
                    <input
                      type="text"
                      className="ig-field__input"
                      placeholder="Enter language"
                      value={customLang}
                      onChange={(e) => setCustomLang(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="ig-quality-row">
                <span className="ig-quality-row__label">Quality</span>
                <div className="ig-quality-toggle">
                  <button
                    type="button"
                    className={`ig-quality-toggle__btn${qualityMode === "fast" ? " is-active" : ""}`}
                    onClick={() => setQualityMode("fast")}
                  >
                    Fast
                  </button>
                  <button
                    type="button"
                    className={`ig-quality-toggle__btn${qualityMode === "standard" ? " is-active" : ""}`}
                    onClick={() => setQualityMode("standard")}
                  >
                    Standard
                  </button>
                </div>
                <span className="ig-quality-row__hint">
                  {qualityMode === "fast"
                    ? "~10–15s · good for previewing"
                    : "~30–40s · higher detail"}
                </span>
              </div>

              <button
                type="button"
                className="skinlog__btn"
                onClick={handleGenerate}
                disabled={!diagnosis.trim()}
              >
                Generate infographics
              </button>
            </div>

            <ol className="ig-steps">
              <li className="ig-steps__item">
                <span className="ig-steps__num">01</span>
                <span>
                  <strong>Enter diagnosis</strong>
                  AI writes structured patient content
                </span>
              </li>
              <li className="ig-steps__item">
                <span className="ig-steps__num">02</span>
                <span>
                  <strong>Choose a style</strong>
                  Two AI-generated designs stream in parallel
                </span>
              </li>
              <li className="ig-steps__item">
                <span className="ig-steps__num">03</span>
                <span>
                  <strong>Edit and export</strong>
                  Refine with prompts or presets, save as PNG
                </span>
              </li>
            </ol>
            </div>

            <p className="skinlog__disclaimer">
              For patient education only. Not a substitute for medical advice.
            </p>
          </>
        )}

        {step === "generating" && generatingPhase === "content" && (
          <div className="ig-generating">
            <span className="skinlog__spinner ig-generating__spinner" />
            <p className="ig-generating__label">Generating content…</p>
          </div>
        )}

        {(step === "preview" || (step === "generating" && generatingPhase === "designs")) && (
          <div className="ig-preview">
            <h1 className="skinlog__title">
              {generatingPhase === "designs" || (!doneA || !doneB)
                ? "Generating designs…"
                : "Choose a style"}
            </h1>
            {(doneA && doneB) && (
              <p className="skinlog__lead ig-preview__lead">
                Click a design to open the editor, or{" "}
                <button type="button" className="ig-text-btn" onClick={handleRegenerate}>
                  start over
                </button>
                .
              </p>
            )}

            {content && (
              <div className="ig-preview__meta">
                <span className="ig-preview__tag">{content.title}</span>
                <span className="ig-preview__lang">{lang}</span>
              </div>
            )}

            <div className="ig-templates">
              {(["A", "B"] as const).map((variant) => {
                const preview = variant === "A" ? previewA : previewB;
                const done = variant === "A" ? doneA : doneB;
                const design = variant === "A" ? designA : designB;
                const isReady = done && design;

                return (
                  <button
                    key={variant}
                    type="button"
                    className={`ig-template-card${isReady ? "" : " is-loading"}`}
                    onClick={() => isReady && handleSelectDesign(design!)}
                    disabled={!isReady}
                    aria-label={`Select style ${variant}`}
                  >
                    <div className="ig-template-card__label">
                      Style {variant}
                      {!done && <span className="ig-template-card__loading-dot" />}
                    </div>
                    <div className="ig-template-card__img-wrap">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt={`Infographic style ${variant}`}
                          className={`ig-template-card__img${done ? "" : " is-partial"}`}
                        />
                      ) : (
                        <div className="ig-template-card__skeleton">
                          <span className="skinlog__spinner" />
                        </div>
                      )}
                    </div>
                    <div className="ig-template-card__cta">
                      {isReady ? "Edit this style" : "Generating…"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
