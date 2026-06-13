"use client";

import { useEffect, useRef, useState } from "react";
import { captureVideoFrame } from "@/lib/skinlog/photo";

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
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
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
        }
      } catch {
        setError(
          "Could not access the camera. Allow permission and use HTTPS or localhost.",
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

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
        {prompt ? <p className="skinlog-camera__prompt">{prompt}</p> : null}
      </div>
      <button
        type="button"
        className="skinlog-camera__shutter"
        aria-label="Take photo"
        disabled={!ready || disabled || capturing}
        onClick={handleCapture}
      />
    </div>
  );
}
