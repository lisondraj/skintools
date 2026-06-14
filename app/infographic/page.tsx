"use client";

import { useState, useRef } from "react";
import type { InfographicContent, InfographicDoc } from "@/lib/infographic/types";
import { buildTemplateA, buildTemplateB } from "@/lib/infographic/templates";
import { InfographicSVG } from "@/components/infographic/InfographicSVG";
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
  const [error, setError] = useState("");
  const [filling, setFilling] = useState(false);

  const [content, setContent] = useState<InfographicContent | null>(null);
  const [docA, setDocA] = useState<InfographicDoc | null>(null);
  const [docB, setDocB] = useState<InfographicDoc | null>(null);
  const [activeDoc, setActiveDoc] = useState<InfographicDoc | null>(null);

  const [hoveredVariant, setHoveredVariant] = useState<"A" | "B" | null>(null);
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

      const data = (await res.json()) as {
        content?: InfographicContent;
        error?: string;
      };

      if (!res.ok || data.error) {
        setError(data.error ?? "Generation failed.");
        setStep("input");
        setGeneratingPhase(null);
        return;
      }

      const generatedContent = data.content!;

      setGeneratingPhase("designs");
      const designRes = await fetch("/api/infographic/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosis: diagnosis.trim() }),
      });

      const designData = (await designRes.json()) as {
        imageA?: string;
        imageB?: string;
        error?: string;
      };

      if (!designRes.ok || designData.error) {
        setError(designData.error ?? "Design generation failed.");
        setStep("input");
        setGeneratingPhase(null);
        return;
      }

      const a = buildTemplateA(generatedContent, designData.imageA!);
      const b = buildTemplateB(generatedContent, designData.imageB!);

      setContent(generatedContent);
      setDocA(a);
      setDocB(b);
      setActiveDoc(null);
      setGeneratingPhase(null);
      setStep("preview");
    } catch {
      setError("Network error. Please try again.");
      setStep("input");
      setGeneratingPhase(null);
    }
  }

  function handleSelectTemplate(doc: InfographicDoc) {
    setActiveDoc(doc);
    setStep("editor");
  }

  function handleBack() {
    setStep("preview");
    setActiveDoc(null);
  }

  function handleRegenerate() {
    setStep("input");
    setActiveDoc(null);
    setDocA(null);
    setDocB(null);
    setContent(null);
  }

  // ── Editor view ──────────────────────────────────────────────
  if (step === "editor" && activeDoc) {
    return (
      <div className="ig">
        <InfographicEditor doc={activeDoc} onBack={handleBack} />
      </div>
    );
  }

  // ── Main shell ───────────────────────────────────────────────
  return (
    <div className="ig">
      <div className="ig__shell">
        <header className="ig__header">
          <h1 className="ig__logo">Infographic Builder</h1>
          <p className="ig__tagline">AI-generated patient education infographics</p>
        </header>

        {/* Input form */}
        {(step === "input" || step === "generating") && (
          <div className="ig__form-wrap">
            <div className="ig__form">
              {error && <div className="ig__error">{error}</div>}

              {/* Diagnosis */}
              <div className="ig__field">
                <label className="ig__label" htmlFor="ig-diagnosis">
                  Diagnosis
                </label>
                <input
                  ref={diagnosisRef}
                  id="ig-diagnosis"
                  type="text"
                  className="ig__input"
                  placeholder="e.g. Atopic Dermatitis, Type 2 Diabetes, Hypertension…"
                  value={diagnosis}
                  onChange={(e) => {
                    setDiagnosis(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={step === "generating"}
                  autoFocus
                />
              </div>

              {/* Instructions */}
              <div className="ig__field">
                <div className="ig__label-row">
                  <label className="ig__label" htmlFor="ig-instructions">
                    Instructions
                  </label>
                  <button
                    type="button"
                    className="ig__ai-fill-btn"
                    onClick={handleFillInstructions}
                    disabled={filling || step === "generating"}
                  >
                    {filling ? (
                      <>
                        <span className="ig__spinner" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <span className="ig__sparkle">✦</span>
                        AI fill
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="ig-instructions"
                  className="ig__textarea"
                  placeholder="Paste clinical instructions, key messages, or leave blank — AI fills in the gaps."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  disabled={step === "generating" || filling}
                  rows={4}
                />
              </div>

              {/* Language */}
              <div className="ig__field">
                <label className="ig__label" htmlFor="ig-language">
                  Language
                </label>
                <div className="ig__lang-row">
                  <select
                    id="ig-language"
                    className="ig__select"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setCustomLang("");
                    }}
                    disabled={step === "generating"}
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
                      className="ig__input ig__input--lang"
                      placeholder="Enter language"
                      value={customLang}
                      onChange={(e) => setCustomLang(e.target.value)}
                      disabled={step === "generating"}
                    />
                  )}
                </div>
              </div>

              {/* Generate button */}
              <button
                type="button"
                className="ig__generate-btn"
                onClick={handleGenerate}
                disabled={step === "generating" || !diagnosis.trim()}
              >
                {step === "generating" ? (
                  <>
                    <span className="ig__spinner" />
                    {generatingPhase === "designs"
                      ? "Generating design images…"
                      : "Generating content…"}
                  </>
                ) : (
                  "Generate infographics"
                )}
              </button>
            </div>

            {/* Steps explainer */}
            <div className="ig__how">
              <div className="ig__how-step">
                <div className="ig__how-num">01</div>
                <div className="ig__how-text">
                  <strong>Enter diagnosis</strong>
                  <span>AI generates structured patient content</span>
                </div>
              </div>
              <div className="ig__how-step">
                <div className="ig__how-num">02</div>
                <div className="ig__how-text">
                  <strong>Choose a style</strong>
                  <span>Two AI-generated designs side by side</span>
                </div>
              </div>
              <div className="ig__how-step">
                <div className="ig__how-num">03</div>
                <div className="ig__how-text">
                  <strong>Edit &amp; export</strong>
                  <span>Edit text overlays — export as PNG or SVG</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {step === "preview" && docA && docB && (
          <div className="ig__preview-wrap">
            <div className="ig__preview-header">
              <h2 className="ig__preview-title">Choose a style</h2>
              <p className="ig__preview-sub">
                Click a design to open the editor — or{" "}
                <button
                  type="button"
                  className="ig__text-btn"
                  onClick={handleRegenerate}
                >
                  start over
                </button>
              </p>
            </div>

            {content && (
              <div className="ig__content-summary">
                <span className="ig__content-tag">{content.title}</span>
                <span className="ig__content-meta">{lang}</span>
              </div>
            )}

            <div className="ig__template-grid">
              {([docA, docB] as InfographicDoc[]).map((doc) => (
                <button
                  key={doc.variant}
                  type="button"
                  className={`ig__template-card ${hoveredVariant === doc.variant ? "is-hovered" : ""}`}
                  onMouseEnter={() => setHoveredVariant(doc.variant)}
                  onMouseLeave={() => setHoveredVariant(null)}
                  onClick={() => handleSelectTemplate(doc)}
                  aria-label={`Select template ${doc.variant}`}
                >
                  <div className="ig__template-badge">
                    Style {doc.variant}
                  </div>
                  <div className="ig__template-svg-wrap">
                    <InfographicSVG
                      doc={doc}
                      className="ig__template-svg"
                    />
                  </div>
                  <div className="ig__template-cta">
                    Edit this style →
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
