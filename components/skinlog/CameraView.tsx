"use client";

import { useEffect, useRef, useState } from "react";
import { captureVideoFrame } from "@/lib/skinlog/photo";

type FacingMode = "environment" | "user";

type CameraViewProps = {
  prompt?: string;
  stepLabel?: string;
  onCapture: (photo: string) => void;
  disabled?: boolean;
};

export function CameraView({
  prompt,
  stepLabel,
  onCapture,
  disabled = false,
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
      streamRef.current?.getTracks().forEach((track) => track.stop());
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
          stream.getTracks().forEach((track) => track.stop());
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
          "Could not access the camera. Allow permission and use HTTPS or localhost.",
        );
      } finally {
        if (!cancelled) setSwitching(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  function handleSwitchCamera() {
    if (switching || capturing || disabled) return;
    setFacingMode((current) =>
      current === "environment" ? "user" : "environment",
    );
  }

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready || disabled || capturing) return;

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

  if (error) {
    return (
      <div className="skinlog-camera">
        <div className="skinlog-camera__empty">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="skinlog-camera">
        <video
          ref={videoRef}
          className="skinlog-camera__video"
          playsInline
          muted
          autoPlay
        />
        {stepLabel ? (
          <span className="skinlog-camera__step">{stepLabel}</span>
        ) : null}
        <button
          type="button"
          className="skinlog-camera__switch"
          aria-label={
            facingMode === "environment"
              ? "Switch to front camera"
              : "Switch to back camera"
          }
          disabled={!ready || disabled || capturing || switching}
          onClick={handleSwitchCamera}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <path
              d="M7 8h10l-1.5-2h-4L10 8z"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
            <rect
              x="5"
              y="8"
              width="14"
              height="10"
              rx="2"
              strokeWidth="1.75"
            />
            <path
              d="M9 5 7 3M15 5l2-2"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {prompt ? <p className="skinlog-camera__prompt">{prompt}</p> : null}
      </div>
      <div className="skinlog-camera__controls">
        <button
          type="button"
          className="skinlog-camera__shutter"
          aria-label="Take photo"
          disabled={!ready || disabled || capturing || switching}
          onClick={handleCapture}
        />
      </div>
    </div>
  );
}
