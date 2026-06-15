"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Conversation } from "@11labs/client";
import type { DisconnectionDetails } from "@11labs/client";
import { GradientOrb } from "@/components/vsp/GradientOrb";
import { appendTranscriptTurn, Transcript } from "@/components/vsp/Transcript";
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
import type { VspTurn } from "@/lib/vsp/types";

type SimStatus = "idle" | "connecting" | "listening" | "speaking" | "error" | "ended";

type SessionResult = {
  transcript: VspTurn[];
  durationSec: number;
};

type Props = {
  config: PatientSimConfig;
  autoStart?: boolean;
  onComplete: (result: SessionResult) => void;
};

function disconnectMessage(details: DisconnectionDetails, connected: boolean): string {
  if (details.reason === "error") {
    return details.message || "Connection closed unexpectedly.";
  }
  if (details.reason === "agent" && !connected) {
    return "The agent closed the session before connecting. Check ElevenLabs agent configuration and API key.";
  }
  if (details.reason === "agent") {
    return "The patient ended the conversation.";
  }
  return "";
}

export function SessionRunner({ config, autoStart = false, onComplete }: Props) {
  const [status, setStatus] = useState<SimStatus>("idle");
  const [error, setError] = useState("");
  const [micOpen, setMicOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [remainingSec, setRemainingSec] = useState(() => getSimTimeLimitSeconds(config));
  const [transcript, setTranscript] = useState<VspTurn[]>([]);

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
  const transcriptRef = useRef<VspTurn[]>([]);
  const completedRef = useRef(false);

  const totalSec = getSimTimeLimitSeconds(config);

  const pushContext = useCallback(
    (conv: NonNullable<typeof convRef.current>, elapsedSec: number, mic: boolean) => {
      conv.sendContextualUpdate(buildSessionContextUpdate(config, elapsedSec, totalSec, mic));
    },
    [config, totalSec],
  );

  const appendTurn = useCallback((role: VspTurn["role"], text: string) => {
    const at = connectedRef.current
      ? Math.floor((Date.now() - connectTimeRef.current) / 1000)
      : 0;
    transcriptRef.current = appendTranscriptTurn(transcriptRef.current, role, text, at);
    setTranscript([...transcriptRef.current]);
  }, []);

  const emitComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const durationSec = connectedRef.current
      ? Math.floor((Date.now() - connectTimeRef.current) / 1000)
      : 0;
    onComplete({ transcript: transcriptRef.current, durationSec });
  }, [onComplete]);

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
      conv.sendContextualUpdate(buildMicUnmuteUpdate(config));
    } else if (!micOpen && prev) {
      conv.sendContextualUpdate(buildMicMuteUpdate(config));
    } else {
      pushContext(conv, elapsedSec, micOpen);
    }

    prevMicOpenRef.current = micOpen;
  }, [micOpen, pushContext, config]);

  const finishSession = useCallback(
    (endRemote = true) => {
      sessionGenRef.current += 1;
      cleanup(endRemote);
      connectedRef.current = false;
      setMicOpen(false);
      prevMicOpenRef.current = false;
      setStatus("ended");
      emitComplete();
    },
    [cleanup, emitComplete],
  );

  const start = useCallback(async () => {
    const gen = ++sessionGenRef.current;
    setError("");
    setStatus("connecting");
    setMicOpen(false);
    prevMicOpenRef.current = false;
    setRemainingSec(totalSec);
    setTranscript([]);
    transcriptRef.current = [];
    completedRef.current = false;
    connectedRef.current = false;
    connectTimeRef.current = 0;
    startedRef.current = true;
    phaseSentRef.current = { warning: false, urgent: false, end: false };
    lastMinuteRef.current = 0;

    try {
      const session = await createRealtimeSession({ sim: config });
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
          persona: config.persona,
          scenario: config.scenario,
          difficulty: config.difficulty,
          time_limit_minutes: String(getSimTimeLimitMinutes(config)),
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
          emitComplete();
        },
        onError: (message: string) => {
          setError(message || "Connection error.");
          setStatus("error");
        },
        onModeChange: ({ mode }: { mode: "speaking" | "listening" }) => {
          setStatus(mode === "speaking" ? "speaking" : "listening");
        },
        onMessage: ({ message, source }) => {
          const role = source === "user" ? "clinician" : "patient";
          appendTurn(role, message);
        },
      });

      if (gen !== sessionGenRef.current) {
        void conv.endSession();
        return;
      }

      conv.sendContextualUpdate(session.instructions);
      conv.sendContextualUpdate(buildSessionStartContext(config));
      conv.sendContextualUpdate(buildSessionContextUpdate(config, 0, totalSec, false));
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
          convLive.sendContextualUpdate(buildWrapUpContextUpdate(config, "warning"));
        }
        if (phase >= 0.85 && !phaseSentRef.current.urgent) {
          phaseSentRef.current.urgent = true;
          convLive.sendContextualUpdate(buildWrapUpContextUpdate(config, "urgent"));
        }

        const minute = Math.floor(elapsedSec / 60);
        if (minute > 0 && minute !== lastMinuteRef.current) {
          lastMinuteRef.current = minute;
          pushContext(convLive, elapsedSec, micOpenRef.current);
        }

        if (remaining <= 0 && !phaseSentRef.current.end) {
          phaseSentRef.current.end = true;
          convLive.sendContextualUpdate(buildWrapUpContextUpdate(config, "end"));
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
      setError(err instanceof Error ? err.message : "Could not start session.");
    }
  }, [appendTurn, cleanup, config, emitComplete, finishSession, pushContext, totalSec]);

  useEffect(() => {
    if (autoStart && !startedRef.current) void start();
  }, [autoStart, start]);

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
    <div className="vsp-runner">
      <header className="vsp-runner__header">
        <div className="vsp-runner__header-main">
          <span className="vsp-runner__eyebrow">Virtual patient</span>
          <p className="vsp-runner__persona">{config.persona}</p>
        </div>
        <div className="vsp-runner__meta">
          {isLive && (
            <span className={`vsp-runner__timer${timerLow ? " is-low" : ""}`}>
              {formatSimCountdown(remainingSec)}
            </span>
          )}
          <span className="vsp-runner__pill">{statusLabel[status]}</span>
        </div>
      </header>

      <div className="vsp-runner__stage">
        <GradientOrb level={audioLevel} status={status} micOpen={micOpen} />
        <p className="vsp-runner__hint">
          {status === "idle" && "Start when ready. Unmute to speak, mute when done — the patient replies after you mute."}
          {status === "connecting" && "Setting up voice connection…"}
          {status === "listening" && !micOpen && "Unmute to speak. The patient waits until you mute again."}
          {status === "listening" && micOpen && "Speaking… mute when finished."}
          {status === "speaking" && "Patient is responding…"}
          {status === "error" && "Something went wrong. Retry or end the session."}
          {status === "ended" && "Session complete. Review your transcript below."}
        </p>
      </div>

      {(isLive || status === "ended") && (
        <div className="vsp-runner__transcript-wrap">
          <p className="vsp-runner__transcript-label">Transcript</p>
          <Transcript turns={transcript} live={isLive} />
        </div>
      )}

      {status === "error" && error && <div className="vsp-tool__error">{error}</div>}

      <footer className="vsp-tool__actions">
        {status === "idle" && (
          <button type="button" className="vsp-tool__btn" onClick={() => void start()}>
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
              className="vsp-tool__btn"
              onClick={() => {
                startedRef.current = false;
                void start();
              }}
            >
              Retry
            </button>
            <button
              type="button"
              className="vsp-tool__btn vsp-tool__btn--secondary"
              onClick={() => finishSession(false)}
            >
              End without retry
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
