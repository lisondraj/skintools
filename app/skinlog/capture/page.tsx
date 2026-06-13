"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CameraView } from "@/components/skinlog/CameraView";
import { LesionBlock } from "@/components/skinlog/LesionBlock";
import { ModeToggle } from "@/components/skinlog/ModeToggle";
import { generateLesionsFromCapture } from "@/lib/skinlog/detection";
import { formatDateKey, saveEntry } from "@/lib/skinlog/storage";
import type { ScanEntry, ScanMode, StoredLesion } from "@/lib/skinlog/types";

const FULL_BODY_STEPS = [
  { id: "front", label: "Step 1 of 6", prompt: "Front torso — arms slightly out" },
  { id: "back", label: "Step 2 of 6", prompt: "Back — turn around, arms out" },
  { id: "left-arm", label: "Step 3 of 6", prompt: "Left arm — palm up, full length" },
  { id: "right-arm", label: "Step 4 of 6", prompt: "Right arm — palm up, full length" },
  { id: "legs", label: "Step 5 of 6", prompt: "Legs — front view, feet visible" },
  { id: "head-neck", label: "Step 6 of 6", prompt: "Head and neck — face forward" },
] as const;

type Phase = "capture" | "analyzing" | "review";

export default function SkinLogCapturePage() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>("single");
  const [phase, setPhase] = useState<Phase>("capture");
  const [stepIndex, setStepIndex] = useState(0);
  const [lesions, setLesions] = useState<StoredLesion[]>([]);
  const [source, setSource] = useState<"openai" | "mock">("mock");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fullBodyStep = FULL_BODY_STEPS[stepIndex];
  const isFullBody = mode === "full-body";

  async function handleCapture(photo: string) {
    setPhase("analyzing");
    setError(null);

    try {
      const result = await generateLesionsFromCapture(photo, mode);
      setSource((prev) => (prev === "openai" ? "openai" : result.source));

      const stored = result.lesions.map((lesion) => ({
        ...lesion,
        id: crypto.randomUUID(),
        photo,
      }));

      if (isFullBody) {
        setLesions((prev) => [...prev, ...stored]);
        if (stepIndex < FULL_BODY_STEPS.length - 1) {
          setStepIndex((index) => index + 1);
          setPhase("capture");
          return;
        }
      } else {
        setLesions(stored);
      }

      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setPhase("capture");
    }
  }

  function handleRetake() {
    setLesions([]);
    setStepIndex(0);
    setSource("mock");
    setError(null);
    setPhase("capture");
  }

  function handleModeChange(nextMode: ScanMode) {
    if (phase !== "capture") return;
    setMode(nextMode);
    setStepIndex(0);
    setLesions([]);
    setError(null);
  }

  async function handleSave() {
    if (lesions.length === 0) return;

    setSaving(true);
    const entry: ScanEntry = {
      id: crypto.randomUUID(),
      mode,
      date: formatDateKey(),
      createdAt: Date.now(),
      source,
      lesions,
    };

    saveEntry(entry);
    router.push("/skinlog/history");
  }

  return (
    <div className="skinlog__inner">
      <header className="skinlog__header">
        <Link href="/skinlog" className="skinlog__logo">
          SkinLog
        </Link>
      </header>

      <main className="skinlog__section">
        {phase === "capture" ? (
          <>
            <h1 className="skinlog__title" style={{ fontSize: 22, marginBottom: 16 }}>
              {isFullBody ? "Full body scan" : "Single lesion"}
            </h1>

            <div style={{ marginBottom: 20 }}>
              <ModeToggle
                value={mode}
                onChange={handleModeChange}
                disabled={stepIndex > 0}
              />
            </div>

            <CameraView
              prompt={isFullBody ? fullBodyStep.prompt : "Center the lesion in frame"}
              stepLabel={isFullBody ? fullBodyStep.label : undefined}
              onCapture={handleCapture}
            />

            {error ? (
              <div className="skinlog__error" style={{ marginTop: 16 }}>
                {error}
              </div>
            ) : null}

            <p className="skinlog__disclaimer">
              For personal tracking only. Not a medical diagnosis.
            </p>
          </>
        ) : null}

        {phase === "analyzing" ? (
          <div className="skinlog__loading">
            <div className="skinlog__spinner" aria-hidden />
            <p>Analyzing photo…</p>
          </div>
        ) : null}

        {phase === "review" ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h1 className="skinlog__title" style={{ fontSize: 22, margin: 0 }}>
                Review
              </h1>
              <span
                className={`skinlog__badge${
                  source === "openai" ? " skinlog__badge--ai" : ""
                }`}
              >
                {source === "openai" ? "AI" : "Sample"}
              </span>
            </div>

            <p className="skinlog__lead" style={{ marginBottom: 20 }}>
              {lesions.length} lesion{lesions.length === 1 ? "" : "s"} found.
              Save to add to your history.
            </p>

            {lesions.map((lesion) => (
              <LesionBlock key={lesion.id} lesion={lesion} />
            ))}

            <p className="skinlog__disclaimer">
              For personal tracking only. Not a medical diagnosis.
            </p>

            <div className="skinlog-review-actions">
              <button
                type="button"
                className="skinlog__btn"
                disabled={saving}
                onClick={handleSave}
              >
                Save to history
              </button>
              <button
                type="button"
                className="skinlog__btn skinlog__btn--secondary"
                disabled={saving}
                onClick={handleRetake}
              >
                Retake
              </button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
