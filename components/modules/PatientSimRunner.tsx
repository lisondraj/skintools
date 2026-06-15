"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@11labs/client";
import { createRealtimeSession } from "@/lib/modules/client";
import type { PatientSimConfig } from "@/lib/modules/types";

type SimStatus = "idle" | "connecting" | "listening" | "speaking" | "error" | "ended";

type Props = {
  sim: PatientSimConfig;
  onEnd: () => void;
  autoStart?: boolean;
};

/** Animate an orb driven by an audio level (0–1). */
function SpeakingOrb({ level, status }: { level: number; status: SimStatus }) {
  const scale = 1 + level * 0.55;
  const opacity = status === "speaking" ? 0.85 + level * 0.15 : 0.4;
  const rings = status === "speaking" ? level : 0;

  const color =
    status === "error"
      ? "#ef4444"
      : status === "ended"
        ? "rgba(0,0,0,0.15)"
        : status === "connecting"
          ? "#f59e0b"
          : "#6366f1";

  return (
    <div className="sim-orb-wrap" aria-hidden>
      {/* outer ripple rings */}
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="sim-orb-ring"
          style={{
            transform: `scale(${1 + rings * 0.35 * i})`,
            opacity: rings * (0.18 / i),
            borderColor: color,
          }}
        />
      ))}
      {/* core orb */}
      <span
        className="sim-orb-core"
        style={{
          transform: `scale(${scale})`,
          opacity,
          background: color,
        }}
      />
    </div>
  );
}

export function PatientSimRunner({ sim, onEnd, autoStart = false }: Props) {
  const [status, setStatus] = useState<SimStatus>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<{ role: "patient" | "you"; text: string }[]>([]);
  const [muted, setMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const convRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const startedRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (convRef.current) {
      void convRef.current.endSession();
      convRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    convRef.current?.setMicMuted(muted);
  }, [muted]);

  const start = useCallback(async () => {
    setError("");
    setStatus("connecting");
    startedRef.current = true;

    try {
      const session = await createRealtimeSession({ sim });

      const conv = await Conversation.startSession({
        signedUrl: session.signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: session.instructions },
            firstMessage: "Hello. I'm ready when you are. What would you like to know?",
          },
          tts: {
            voiceId: session.voiceId,
          },
        },
        onConnect: () => {
          setStatus("listening");
        },
        onDisconnect: () => {
          setStatus("ended");
          setAudioLevel(0);
        },
        onError: (message: string) => {
          setError(message || "Connection error.");
          setStatus("error");
        },
        onModeChange: ({ mode }: { mode: "speaking" | "listening" }) => {
          if (mode === "speaking") setStatus("speaking");
          else setStatus("listening");
        },
        onMessage: ({ message, source }: { message: string; source: "user" | "ai" }) => {
          if (source === "ai") {
            setTranscript((prev) => [...prev, { role: "patient", text: message }]);
          } else {
            setTranscript((prev) => [...prev, { role: "you", text: message }]);
          }
        },
      });

      convRef.current = conv;

      // Drive orb from volume level
      function tick() {
        const vol = conv.getInputVolume?.() ?? 0;
        const agentVol = conv.getOutputVolume?.() ?? 0;
        const level = Math.max(vol, agentVol);
        setAudioLevel(Number(level.toFixed(3)));
        animFrameRef.current = requestAnimationFrame(tick);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      cleanup();
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not start simulation.");
    }
  }, [cleanup, sim]);

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      void start();
    }
  }, [autoStart, start]);

  function handleEnd() {
    cleanup();
    setStatus("ended");
    onEnd();
  }

  const statusLabel: Record<SimStatus, string> = {
    idle: "Ready to start",
    connecting: "Connecting…",
    listening: "Listening — speak to the patient",
    speaking: "Patient is speaking…",
    error: "Connection failed",
    ended: "Session ended",
  };

  return (
    <div className="modules-sim-runner">
      <SpeakingOrb level={audioLevel} status={status} />

      <div className="modules-sim-runner__status-row">
        <span className={`modules-sim-runner__dot modules-sim-runner__dot--${status}`} />
        <span className="modules-sim-runner__status-text">{statusLabel[status]}</span>
      </div>

      {status === "error" && error && (
        <div className="modules-sim-runner__error">{error}</div>
      )}

      {transcript.length > 0 && (
        <div className="modules-sim-runner__transcript">
          {transcript.slice(-8).map((line, i) => (
            <p
              key={`${i}-${line.text.slice(0, 12)}`}
              className={`modules-sim-runner__line modules-sim-runner__line--${line.role}`}
            >
              <span className="modules-sim-runner__line-label">
                {line.role === "patient" ? "Patient" : "You"}
              </span>
              {line.text}
            </p>
          ))}
        </div>
      )}

      <div className="modules-sim-runner__actions">
        {status === "idle" && (
          <button type="button" className="modules-btn" onClick={() => void start()}>
            Start conversation
          </button>
        )}
        {(status === "listening" || status === "speaking" || status === "connecting") && (
          <>
            <button
              type="button"
              className={`modules-btn modules-btn--secondary${muted ? " is-active" : ""}`}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? "Unmute mic" : "Mute mic"}
            </button>
            <button type="button" className="modules-btn" onClick={handleEnd}>
              End &amp; continue
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <button
              type="button"
              className="modules-btn"
              onClick={() => {
                startedRef.current = false;
                void start();
              }}
            >
              Retry
            </button>
            <button type="button" className="modules-btn modules-btn--secondary" onClick={onEnd}>
              Skip
            </button>
          </>
        )}
        {status === "ended" && (
          <button type="button" className="modules-btn" onClick={onEnd}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
