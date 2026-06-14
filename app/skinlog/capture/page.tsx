"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnnotatedPhoto } from "@/components/skinlog/AnnotatedPhoto";
import { CameraView } from "@/components/skinlog/CameraView";
import { FindingList } from "@/components/skinlog/FindingList";
import { LesionBlock } from "@/components/skinlog/LesionBlock";
import { ModeToggle } from "@/components/skinlog/ModeToggle";
import { generateLesionsFromCapture } from "@/lib/skinlog/detection";
import { formatDateKey, saveEntry } from "@/lib/skinlog/storage";
import type { ScanEntry, ScanMode, StoredLesion } from "@/lib/skinlog/types";

const FULL_BODY_STEPS = [
  { id: "front",     label: "1 / 6", prompt: "Front torso — arms slightly out" },
  { id: "back",      label: "2 / 6", prompt: "Back — turn around, arms out" },
  { id: "left-arm",  label: "3 / 6", prompt: "Left arm — palm up, full length" },
  { id: "right-arm", label: "4 / 6", prompt: "Right arm — palm up, full length" },
  { id: "legs",      label: "5 / 6", prompt: "Legs — front view, feet visible" },
  { id: "head-neck", label: "6 / 6", prompt: "Head and neck — face forward" },
] as const;

type Phase = "capture" | "analyzing" | "review";

export default function SkinLogCapturePage() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>("single");
  const [phase, setPhase] = useState<Phase>("capture");
  const [stepIndex, setStepIndex] = useState(0);
  const [lesions, setLesions] = useState<StoredLesion[]>([]);
  const [saving, setSaving] = useState(false);

  const isFullBody = mode === "full-body";
  const fullBodyStep = FULL_BODY_STEPS[stepIndex];

  // Flip theme-color (Dynamic Island / status bar chrome) black for camera, white for white pages
  useEffect(() => {
    const isCamera = phase === "capture" || phase === "analyzing";
    const color = isCamera ? "#000000" : "#ffffff";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
    return () => {
      meta!.content = "#ffffff";
    };
  }, [phase]);

  async function handleCapture(photo: string) {
    setPhase("analyzing");
    const scanMode = mode;

    try {
      const result = await generateLesionsFromCapture(photo, scanMode);
      const stored: StoredLesion[] = result.lesions.map((l) => ({
        ...l,
        id: crypto.randomUUID(),
        photo,
      }));

      if (scanMode === "full-body") {
        setLesions((prev) => [...prev, ...stored]);
        const isLastStep = stepIndex >= FULL_BODY_STEPS.length - 1;
        if (!isLastStep) {
          setStepIndex((current) => current + 1);
          setPhase("capture");
        } else {
          setPhase("review");
        }
        return;
      }

      setLesions(stored);
      setPhase("review");
    } catch (err) {
      setPhase("capture");
      throw err;
    }
  }

  function handleRetake() {
    setLesions([]);
    setStepIndex(0);
    setPhase("capture");
  }

  function handleModeChange(next: ScanMode) {
    if (phase !== "capture") return;
    setMode(next);
    setStepIndex(0);
    setLesions([]);
  }

  function handleSave() {
    if (lesions.length === 0) return;
    setSaving(true);
    const entry: ScanEntry = {
      id: crypto.randomUUID(),
      mode,
      date: formatDateKey(),
      createdAt: Date.now(),
      lesions,
    };
    saveEntry(entry);
    router.push("/skinlog/history");
  }

  /* ── Capture + Analyzing: full-screen fixed overlay ── */
  if (phase === "capture" || phase === "analyzing") {
    return (
      <div className="skinlog-capture-screen">
        {/* Logo floats above the camera */}
        <div className="skinlog-capture-screen__header">
          <Link href="/skinlog" className="skinlog-capture-screen__logo">
            SkinLog
          </Link>
        </div>

        {phase === "analyzing" ? (
          <div className="skinlog-capture-screen__analyzing">
            <div className="skinlog__spinner" aria-hidden />
            <p>Analyzing photo…</p>
          </div>
        ) : (
          <CameraView
            prompt={isFullBody ? fullBodyStep.prompt : undefined}
            stepLabel={isFullBody ? fullBodyStep.label : undefined}
            onCapture={handleCapture}
          >
            <ModeToggle
              value={mode}
              onChange={handleModeChange}
              disabled={stepIndex > 0}
            />
          </CameraView>
        )}
      </div>
    );
  }

  /* ── Review: normal scrollable layout ── */
  return (
    <div className="skinlog__inner">
      <header className="skinlog__header">
        <Link href="/skinlog" className="skinlog__logo">
          SkinLog
        </Link>
      </header>

      <main className="skinlog__section">
        {/* Single lesion: annotated photo + description-only log boxes */}
        {mode === "single" && lesions.length > 0 ? (
          <>
            <AnnotatedPhoto photo={lesions[0].photo} lesions={lesions} />
            <FindingList lesions={lesions} />
          </>
        ) : (
          /* Full body: existing LesionBlock with attributes */
          <>
            <h1 className="skinlog__title" style={{ fontSize: 22, marginBottom: 8 }}>
              Review
            </h1>
            <p className="skinlog__lead" style={{ marginBottom: 20 }}>
              {lesions.length} area{lesions.length === 1 ? "" : "s"} noted.
            </p>
            {lesions.map((lesion) => (
              <LesionBlock key={lesion.id} lesion={lesion} />
            ))}
          </>
        )}

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
      </main>
    </div>
  );
}
