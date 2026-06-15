"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@11labs/client";
import type { DisconnectionDetails } from "@11labs/client";
import { createRealtimeSession } from "@/lib/modules/client";
import type { PatientSimConfig } from "@/lib/modules/types";

type SimStatus = "idle" | "connecting" | "listening" | "speaking" | "error" | "ended";

type Props = {
  sim: PatientSimConfig;
  onEnd: () => void;
  autoStart?: boolean;
};

function AudioBars({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="vsp-bars" aria-hidden>
      {[0.35, 0.55, 0.75, 0.55, 0.35].map((mult, i) => (
        <span
          key={i}
          className={`vsp-bars__bar${active ? " is-active" : ""}`}
          style={{
            transform: active ? `scaleY(${0.25 + level * mult * 1.4})` : "scaleY(0.2)",
          }}
        />
      ))}
    </div>
  );
}

function SpeakingOrb({ level, status }: { level: number; status: SimStatus }) {
  const active = status === "listening" || status === "speaking";
  const scale = 1 + level * 0.35;
  const color =
    status === "error"
      ? "#dc2626"
      : status === "connecting"
        ? "#d97706"
        : status === "speaking"
          ? "#4f46e5"
          : status === "listening"
            ? "#059669"
            : "#a3a3a3";

  return (
    <div className="vsp-orb" aria-hidden>
      <span
        className={`vsp-orb__ring${active ? " is-active" : ""}`}
        style={{
          transform: `scale(${1 + level * 0.5})`,
          borderColor: color,
          opacity: active ? 0.35 + level * 0.4 : 0.15,
        }}
      />
      <span
        className="vsp-orb__core"
        style={{
          transform: `scale(${scale})`,
          background: color,
          opacity: status === "ended" ? 0.35 : 0.9,
        }}
      />
    </div>
  );
}

function disconnectMessage(details: DisconnectionDetails, connected: boolean): string {
  if (details.reason === "error") {
    return details.message || "Connection closed unexpectedly.";
  }
  if (details.reason === "agent" && !connected) {
    return "The agent closed the session before connecting. In ElevenLabs → SkinTools agent → Security → Overrides, enable System prompt, First message, and Voice — or set the agent prompt to {{patient_instructions}} with that dynamic variable.";
  }
  if (details.reason === "agent") {
    return "The patient ended the conversation.";
  }
  return "";
}

export function PatientSimRunner({ sim, onEnd, autoStart = false }: Props) {
  const [status, setStatus] = useState<SimStatus>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<{ role: "patient" | "you"; text: string }[]>([]);
  const [muted, setMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const convRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const startedRef = useRef(false);
  const sessionGenRef = useRef(0);
  const connectedRef = useRef(false);
  const connectTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const cleanup = useCallback((endRemote = true) => {
    cancelAnimationFrame(animFrameRef.current);
    if (endRemote && convRef.current) {
      void convRef.current.endSession();
      convRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      sessionGenRef.current += 1;
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    convRef.current?.setMicMuted(muted);
  }, [muted]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [transcript]);

  const start = useCallback(async () => {
    const gen = ++sessionGenRef.current;
    setError("");
    setStatus("connecting");
    connectedRef.current = false;
    connectTimeRef.current = 0;
    startedRef.current = true;

    try {
      const session = await createRealtimeSession({ sim });
      if (gen !== sessionGenRef.current) return;

      // Only override fields enabled on the SkinTools agent (first_message, voice_id).
      // Prompt is injected via sendContextualUpdate — sending a disabled prompt override
      // causes ElevenLabs to end the session immediately.
      const conv = await Conversation.startSession({
        signedUrl: session.signedUrl,
        connectionType: "websocket",
        overrides: {
          agent: {
            firstMessage: "Hello doctor — I'm a bit nervous, but I'm ready to talk. Where should we start?",
          },
          tts: { voiceId: session.voiceId },
        },
        dynamicVariables: {
          persona: sim.persona,
          scenario: sim.scenario,
          difficulty: sim.difficulty,
          patient_instructions: session.instructions,
        },
        onConnect: () => {
          connectedRef.current = true;
          connectTimeRef.current = Date.now();
          setStatus("listening");
        },
        onDisconnect: (details) => {
          const wasConnected = connectedRef.current;
          const duration = wasConnected ? Date.now() - connectTimeRef.current : 0;
          connectedRef.current = false;
          convRef.current = null;
          setAudioLevel(0);

          const abrupt = !wasConnected || duration < 2500;
          if (details.reason === "error" || (details.reason === "agent" && abrupt)) {
            setError(disconnectMessage(details, wasConnected));
            setStatus("error");
            return;
          }

          setStatus("ended");
        },
        onError: (message: string) => {
          setError(message || "Connection error.");
          setStatus("error");
        },
        onModeChange: ({ mode }: { mode: "speaking" | "listening" }) => {
          setStatus(mode === "speaking" ? "speaking" : "listening");
        },
        onMessage: ({ message, source }: { message: string; source: "user" | "ai" }) => {
          setTranscript((prev) => [
            ...prev,
            { role: source === "ai" ? "patient" : "you", text: message },
          ]);
        },
      });

      if (gen !== sessionGenRef.current) {
        void conv.endSession();
        return;
      }

      conv.sendContextualUpdate(session.instructions);
      convRef.current = conv;

      function tick() {
        if (!convRef.current) return;
        const vol = conv.getInputVolume?.() ?? 0;
        const agentVol = conv.getOutputVolume?.() ?? 0;
        setAudioLevel(Number(Math.max(vol, agentVol).toFixed(3)));
        animFrameRef.current = requestAnimationFrame(tick);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      if (gen !== sessionGenRef.current) return;
      cleanup(false);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not start simulation.");
    }
  }, [cleanup, sim]);

  useEffect(() => {
    if (autoStart && !startedRef.current) void start();
  }, [autoStart, start]);

  function handleEnd() {
    sessionGenRef.current += 1;
    cleanup();
    connectedRef.current = false;
    setStatus("ended");
    onEnd();
  }

  const statusLabel: Record<SimStatus, string> = {
    idle: "Ready",
    connecting: "Connecting",
    listening: "Listening",
    speaking: "Patient speaking",
    error: "Error",
    ended: "Ended",
  };

  const isLive = status === "listening" || status === "speaking" || status === "connecting";

  return (
    <div className="vsp-runner">
      <header className="vsp-runner__header">
        <div>
          <span className="vsp-runner__eyebrow">Virtual patient</span>
          <p className="vsp-runner__persona">{sim.persona}</p>
        </div>
        <span className={`vsp-runner__pill vsp-runner__pill--${status}`}>
          {statusLabel[status]}
        </span>
      </header>

      <div className="vsp-runner__stage">
        <SpeakingOrb level={audioLevel} status={status} />
        <AudioBars level={audioLevel} active={isLive} />
        <p className="vsp-runner__hint">
          {status === "idle" && "Start when you're ready to practice the consultation."}
          {status === "connecting" && "Setting up voice connection…"}
          {status === "listening" && "Speak naturally — the patient is listening."}
          {status === "speaking" && "Patient is responding…"}
          {status === "error" && "Something went wrong. You can retry or skip."}
          {status === "ended" && "Session complete."}
        </p>
      </div>

      {status === "error" && error && (
        <div className="vsp-runner__error">{error}</div>
      )}

      {transcript.length > 0 && (
        <div className="vsp-runner__transcript" ref={transcriptRef}>
          {transcript.map((line, i) => (
            <div
              key={`${i}-${line.text.slice(0, 16)}`}
              className={`vsp-bubble vsp-bubble--${line.role}`}
            >
              <span className="vsp-bubble__label">
                {line.role === "patient" ? "Patient" : "You"}
              </span>
              <p className="vsp-bubble__text">{line.text}</p>
            </div>
          ))}
        </div>
      )}

      <footer className="vsp-runner__actions">
        {status === "idle" && (
          <button type="button" className="modules-btn modules-btn--primary" onClick={() => void start()}>
            Start conversation
          </button>
        )}
        {isLive && (
          <>
            <button
              type="button"
              className={`modules-btn modules-btn--secondary${muted ? " is-active" : ""}`}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button type="button" className="modules-btn" onClick={handleEnd}>
              End session
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <button
              type="button"
              className="modules-btn modules-btn--primary"
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
          <button type="button" className="modules-btn modules-btn--primary" onClick={onEnd}>
            Continue presentation
          </button>
        )}
      </footer>
    </div>
  );
}
