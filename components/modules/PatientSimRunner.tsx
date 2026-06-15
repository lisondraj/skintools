"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@11labs/client";
import type { DisconnectionDetails } from "@11labs/client";
import { createRealtimeSession } from "@/lib/modules/client";
import {
  buildMicMuteUpdate,
  buildMicUnmuteUpdate,
  buildSessionContextUpdate,
  buildSessionStartContext,
  buildWrapUpContextUpdate,
  formatSimCountdown,
  getSimTimeLimitMinutes,
  getSimTimeLimitSeconds,
} from "@/lib/modules/realtime";
import type { PatientSimConfig } from "@/lib/modules/types";

type SimStatus = "idle" | "connecting" | "listening" | "speaking" | "error" | "ended";

type Props = {
  sim: PatientSimConfig;
  onEnd: () => void;
  autoStart?: boolean;
  presentMode?: boolean;
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

function SpeakingOrb({ level, status, micOpen }: { level: number; status: SimStatus; micOpen: boolean }) {
  const active = status === "listening" || status === "speaking";
  const scale = 1 + level * 0.35;
  const color =
    status === "error"
      ? "#dc2626"
      : status === "connecting"
        ? "#d97706"
        : status === "speaking"
          ? "#4f46e5"
          : status === "listening" && micOpen
            ? "#059669"
            : status === "listening"
              ? "#64748b"
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

export function PatientSimRunner({ sim, onEnd, autoStart = false, presentMode = false }: Props) {
  const [status, setStatus] = useState<SimStatus>("idle");
  const [error, setError] = useState("");
  const [micOpen, setMicOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [remainingSec, setRemainingSec] = useState(() => getSimTimeLimitSeconds(sim));

  const convRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const startedRef = useRef(false);
  const sessionGenRef = useRef(0);
  const connectedRef = useRef(false);
  const connectTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<number>(0);
  const phaseSentRef = useRef({ warning: false, urgent: false, end: false });
  const lastMinuteRef = useRef(0);
  const micOpenRef = useRef(false);
  const prevMicOpenRef = useRef(false);

  const totalSec = getSimTimeLimitSeconds(sim);

  const pushContext = useCallback(
    (conv: NonNullable<typeof convRef.current>, elapsedSec: number, mic: boolean) => {
      conv.sendContextualUpdate(buildSessionContextUpdate(sim, elapsedSec, totalSec, mic));
    },
    [sim, totalSec],
  );

  const cleanup = useCallback((endRemote = true) => {
    cancelAnimationFrame(animFrameRef.current);
    window.clearInterval(timerRef.current);
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
    micOpenRef.current = micOpen;
    convRef.current?.setMicMuted(!micOpen);
    const conv = convRef.current;
    if (!conv || !connectedRef.current) return;

    const elapsedSec = Math.floor((Date.now() - connectTimeRef.current) / 1000);
    const prev = prevMicOpenRef.current;

    if (micOpen && !prev) {
      conv.sendContextualUpdate(buildMicUnmuteUpdate(sim));
    } else if (!micOpen && prev) {
      conv.sendContextualUpdate(buildMicMuteUpdate(sim));
    } else {
      pushContext(conv, elapsedSec, micOpen);
    }

    prevMicOpenRef.current = micOpen;
  }, [micOpen, pushContext, sim]);

  const finishSession = useCallback(
    (endRemote = true) => {
      sessionGenRef.current += 1;
      cleanup(endRemote);
      connectedRef.current = false;
      setMicOpen(false);
      prevMicOpenRef.current = false;
      setStatus("ended");
    },
    [cleanup],
  );

  const start = useCallback(async () => {
    const gen = ++sessionGenRef.current;
    setError("");
    setStatus("connecting");
    setMicOpen(false);
    prevMicOpenRef.current = false;
    setRemainingSec(totalSec);
    connectedRef.current = false;
    connectTimeRef.current = 0;
    startedRef.current = true;
    phaseSentRef.current = { warning: false, urgent: false, end: false };
    lastMinuteRef.current = 0;

    try {
      const session = await createRealtimeSession({ sim });
      if (gen !== sessionGenRef.current) return;

      const conv = await Conversation.startSession({
        signedUrl: session.signedUrl,
        connectionType: "websocket",
        overrides: {
          agent: {
            firstMessage: "",
          },
          tts: { voiceId: session.voiceId },
        },
        dynamicVariables: {
          persona: sim.persona,
          scenario: sim.scenario,
          difficulty: sim.difficulty,
          time_limit_minutes: String(getSimTimeLimitMinutes(sim)),
          patient_instructions: session.instructions,
        },
        onConnect: () => {
          connectedRef.current = true;
          connectTimeRef.current = Date.now();
          prevMicOpenRef.current = false;
          convRef.current?.setMicMuted(true);
          setStatus("listening");
        },
        onDisconnect: (details) => {
          const wasConnected = connectedRef.current;
          const duration = wasConnected ? Date.now() - connectTimeRef.current : 0;
          connectedRef.current = false;
          convRef.current = null;
          window.clearInterval(timerRef.current);
          setAudioLevel(0);
          setMicOpen(false);

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
      });

      if (gen !== sessionGenRef.current) {
        void conv.endSession();
        return;
      }

      conv.sendContextualUpdate(session.instructions);
      conv.sendContextualUpdate(buildSessionStartContext(sim));
      conv.sendContextualUpdate(
        buildSessionContextUpdate(sim, 0, totalSec, false),
      );
      convRef.current = conv;
      conv.setMicMuted(true);

      timerRef.current = window.setInterval(() => {
        const convLive = convRef.current;
        if (!convLive || !connectedRef.current) return;

        const elapsedSec = Math.floor((Date.now() - connectTimeRef.current) / 1000);
        const remaining = Math.max(0, totalSec - elapsedSec);
        setRemainingSec(remaining);

        const phase = elapsedSec / totalSec;
        if (phase >= 0.75 && !phaseSentRef.current.warning) {
          phaseSentRef.current.warning = true;
          convLive.sendContextualUpdate(buildWrapUpContextUpdate(sim, "warning"));
        }
        if (phase >= 0.85 && !phaseSentRef.current.urgent) {
          phaseSentRef.current.urgent = true;
          convLive.sendContextualUpdate(buildWrapUpContextUpdate(sim, "urgent"));
        }

        const minute = Math.floor(elapsedSec / 60);
        if (minute > 0 && minute !== lastMinuteRef.current) {
          lastMinuteRef.current = minute;
          pushContext(convLive, elapsedSec, micOpenRef.current);
        }

        if (remaining <= 0 && !phaseSentRef.current.end) {
          phaseSentRef.current.end = true;
          convLive.sendContextualUpdate(buildWrapUpContextUpdate(sim, "end"));
          window.setTimeout(() => {
            if (gen === sessionGenRef.current) finishSession(true);
          }, 12000);
        }
      }, 1000);

      function tick() {
        if (!convRef.current) return;
        const vol = convRef.current.getInputVolume?.() ?? 0;
        const agentVol = convRef.current.getOutputVolume?.() ?? 0;
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
  }, [cleanup, finishSession, pushContext, sim, totalSec]);

  useEffect(() => {
    if (autoStart && !startedRef.current) void start();
  }, [autoStart, start]);

  function handleEnd() {
    finishSession(true);
    onEnd();
  }

  function toggleMic() {
    setMicOpen((open) => !open);
  }

  const statusLabel: Record<SimStatus, string> = {
    idle: "Ready",
    connecting: "Connecting",
    listening: micOpen ? "Your turn — speaking" : "Muted — patient waiting",
    speaking: "Patient responding",
    error: "Error",
    ended: "Ended",
  };

  const isLive = status === "listening" || status === "speaking" || status === "connecting";
  const timerLow = remainingSec <= 60;

  return (
    <div className={`vsp-runner${presentMode ? " vsp-runner--present" : ""}`}>
      <header className="vsp-runner__header">
        <div className="vsp-runner__header-main">
          <span className="vsp-runner__eyebrow">Virtual patient</span>
          <p className="vsp-runner__persona">{sim.persona}</p>
          {presentMode && (
            <p className="vsp-runner__scenario">{sim.scenario}</p>
          )}
        </div>
        <div className="vsp-runner__meta">
          {isLive && (
            <span className={`vsp-runner__timer${timerLow ? " is-low" : ""}`}>
              {formatSimCountdown(remainingSec)}
            </span>
          )}
          <span className={`vsp-runner__pill vsp-runner__pill--${status}`}>
            {statusLabel[status]}
          </span>
        </div>
      </header>

      <div className="vsp-runner__stage">
        <div className={`vsp-runner__orb-wrap${status === "speaking" ? " is-speaking" : ""}${micOpen ? " is-mic-live" : ""}`}>
          <SpeakingOrb level={audioLevel} status={status} micOpen={micOpen} />
        </div>
        <AudioBars level={audioLevel} active={isLive} />
        <p className="vsp-runner__hint">
          {status === "idle" && "Start when you're ready. Push-to-talk: unmute to speak, mute when done — the patient replies after you mute."}
          {status === "connecting" && "Setting up voice connection…"}
          {status === "listening" && !micOpen && "Unmute to speak. The patient waits silently until you mute again."}
          {status === "listening" && micOpen && "Speaking… mute when finished — the patient responds after you mute."}
          {status === "speaking" && "Patient is responding…"}
          {status === "error" && "Something went wrong. You can retry or skip."}
          {status === "ended" && "Session complete."}
        </p>
      </div>

      {status === "error" && error && (
        <div className="vsp-runner__error">{error}</div>
      )}

      <footer className="vsp-runner__actions">
        {status === "idle" && (
          <button type="button" className="modules-btn modules-btn--primary" onClick={() => void start()}>
            Start conversation
          </button>
        )}
        {isLive && (
          <div className="vsp-runner__live-actions">
            <button
              type="button"
              className={`vsp-runner__mic-btn${micOpen ? " is-live" : ""}`}
              onClick={toggleMic}
            >
              <span className="vsp-runner__mic-icon" aria-hidden>
                {micOpen ? "◉" : "○"}
              </span>
              {micOpen ? "Mute — patient can respond" : "Unmute to speak"}
            </button>
            <button type="button" className="vsp-runner__end-btn" onClick={() => finishSession(true)}>
              End session
            </button>
          </div>
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
