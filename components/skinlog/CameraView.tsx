"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { captureVideoFrame } from "@/lib/skinlog/photo";

type FacingMode = "environment" | "user";

type CameraViewProps = {
  prompt?: string;
  stepLabel?: string;
  onCapture: (photo: string) => void;
  disabled?: boolean;
  /** Rendered inside the bottom overlay — use for mode toggle etc. */
  children?: ReactNode;
};

export function CameraView({
  prompt,
  stepLabel,
  onCapture,
  disabled = false,
  children,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported in this browser.");
        return;
      }

      setReady(false);
      setSwitching(true);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setReady(true);
          setError(null);
        }
      } catch {
        setError(
          "Camera unavailable. Grant permission and open via HTTPS or localhost.",
        );
      } finally {
        if (!cancelled) setSwitching(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  function handleSwitch() {
    if (switching || capturing || disabled) return;
    setFacingMode((c) => (c === "environment" ? "user" : "environment"));
  }

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready || disabled || capturing || switching) return;
    setCapturing(true);
    try {
      const photo = await captureVideoFrame(video);
      onCapture(photo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed.");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="skinlog-camera">
      <video
        ref={videoRef}
        className="skinlog-camera__video"
        playsInline
        muted
        autoPlay
      />

      {/* Step counter — top right */}
      {stepLabel ? (
        <span className="skinlog-camera__step">{stepLabel}</span>
      ) : null}

      {/* Error — shown inside camera above controls */}
      {error ? (
        <div className="skinlog-camera__error-overlay">
          <p>{error}</p>
        </div>
      ) : null}

      {/* Bottom overlay: mode toggle → prompt → shutter row */}
      <div className="skinlog-camera__bottom">
        {children ? (
          <div className="skinlog-camera__controls-slot">{children}</div>
        ) : null}

        {prompt ? <p className="skinlog-camera__prompt">{prompt}</p> : null}

        <div className="skinlog-camera__shutter-row">
          {/* left spacer keeps shutter centred */}
          <div className="skinlog-camera__shutter-spacer" />

          <button
            type="button"
            className="skinlog-camera__shutter"
            aria-label="Take photo"
            disabled={!ready || disabled || capturing || switching}
            onClick={handleCapture}
          />

          <button
            type="button"
            className="skinlog-camera__switch"
            aria-label={
              facingMode === "environment"
                ? "Switch to front camera"
                : "Switch to back camera"
            }
            disabled={!ready || disabled || capturing || switching}
            onClick={handleSwitch}
          >
            {/* Flip / refresh icon */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
