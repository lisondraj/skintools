"use client";

import Link from "next/link";
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

  if (step === "editor" && activeDoc) {
    return (
      <div className="skinlog__inner ig-shell">
        <InfographicEditor doc={activeDoc} onBack={handleBack} />
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
        {(step === "input" || step === "generating") && (
          <>
            <h1 className="skinlog__title">Patient education, made simple.</h1>
            <p className="skinlog__lead">
              Enter a diagnosis and optional instructions. AI generates two
              infographic designs — pick one, edit the text, and export.
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
                  disabled={step === "generating"}
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
                    disabled={filling || step === "generating"}
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
                  disabled={step === "generating" || filling}
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
                      className="ig-field__input"
                      placeholder="Enter language"
                      value={customLang}
                      onChange={(e) => setCustomLang(e.target.value)}
                      disabled={step === "generating"}
                    />
                  )}
                </div>
              </div>

              <button
                type="button"
                className="skinlog__btn"
                onClick={handleGenerate}
                disabled={step === "generating" || !diagnosis.trim()}
              >
                {step === "generating" ? (
                  <>
                    <span className="skinlog__spinner" />
                    {generatingPhase === "designs"
                      ? "Generating designs…"
                      : "Generating content…"}
                  </>
                ) : (
                  "Generate infographics"
                )}
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
                  Two AI-generated designs to compare
                </span>
              </li>
              <li className="ig-steps__item">
                <span className="ig-steps__num">03</span>
                <span>
                  <strong>Edit and export</strong>
                  Adjust text overlays, save as PNG or SVG
                </span>
              </li>
            </ol>
            </div>

            <p className="skinlog__disclaimer">
              For patient education only. Not a substitute for medical advice.
            </p>
          </>
        )}

        {step === "preview" && docA && docB && (
          <div className="ig-preview">
            <h1 className="skinlog__title">Choose a style</h1>
            <p className="skinlog__lead ig-preview__lead">
              Click a design to open the editor, or{" "}
              <button type="button" className="ig-text-btn" onClick={handleRegenerate}>
                start over
              </button>
              .
            </p>

            {content && (
              <div className="ig-preview__meta">
                <span className="ig-preview__tag">{content.title}</span>
                <span className="ig-preview__lang">{lang}</span>
              </div>
            )}

            <div className="ig-templates">
              {([docA, docB] as InfographicDoc[]).map((doc) => (
                <button
                  key={doc.variant}
                  type="button"
                  className="ig-template-card"
                  onClick={() => handleSelectTemplate(doc)}
                  aria-label={`Select style ${doc.variant}`}
                >
                  <div className="ig-template-card__label">Style {doc.variant}</div>
                  <InfographicSVG doc={doc} className="ig-template-card__svg" />
                  <div className="ig-template-card__cta">Edit this style</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
