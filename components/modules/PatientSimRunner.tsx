"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRealtimeSession } from "@/lib/modules/client";
import type { PatientSimConfig } from "@/lib/modules/types";

type SimStatus = "idle" | "connecting" | "listening" | "speaking" | "error" | "ended";

type Props = {
  sim: PatientSimConfig;
  onEnd: () => void;
  autoStart?: boolean;
};

/** Wait for RTCPeerConnection ICE gathering to complete with a timeout. */
function waitForIceComplete(pc: RTCPeerConnection, timeoutMs = 5000): Promise<void> {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve(); // proceed with whatever candidates we have
    }, timeoutMs);
    function onChange() {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      }
    }
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export function PatientSimRunner({ sim, onEnd, autoStart = false }: Props) {
  const [status, setStatus] = useState<SimStatus>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // Keep mic mute state in sync
  useEffect(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
  }, [muted]);

  const start = useCallback(async () => {
    setError("");
    setStatus("connecting");
    startedRef.current = true;

    try {
      // 1. Mint an ephemeral session key server-side
      const session = await createRealtimeSession({ sim });

      // 2. Request microphone
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = micStream;

      // 3. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 4. Attach remote audio — must be in DOM for autoplay to work on all browsers
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.style.display = "none";
      document.body.appendChild(audioEl);
      audioElRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0] ?? null;
        setStatus("listening");
      };

      // 5. Add mic track
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

      // 6. Data channel for transcript events
      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as Record<string, unknown>;
          const type = msg.type as string | undefined;

          if (type === "response.audio_transcript.delta") {
            setStatus("speaking");
          }
          if (type === "response.audio_transcript.done") {
            const text = msg.transcript as string | undefined;
            if (text) setTranscript((prev) => [...prev, `Patient: ${text}`]);
            setStatus("listening");
          }
          if (type === "conversation.item.input_audio_transcription.completed") {
            const text = msg.transcript as string | undefined;
            if (text) setTranscript((prev) => [...prev, `You: ${text}`]);
          }
          if (type === "error") {
            const errMsg = (msg.error as { message?: string } | undefined)?.message;
            if (errMsg) setError(errMsg);
          }
        } catch {
          /* ignore malformed events */
        }
      };

      // 7. Create offer and wait for ICE gathering to complete before sending
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceComplete(pc);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: pc.localDescription!.sdp,
      });

      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(`WebRTC handshake failed (${sdpRes.status}): ${errText}`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      // status will update to "listening" via ontrack
    } catch (err) {
      cleanup();
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Could not start simulation.";
      setError(msg);
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

  return (
    <div className="modules-sim-runner">
      <div className="modules-sim-runner__status-row">
        <span className={`modules-sim-runner__dot modules-sim-runner__dot--${status}`} />
        <span className="modules-sim-runner__status-text">
          {status === "idle" && "Ready to start patient conversation"}
          {status === "connecting" && "Connecting…"}
          {status === "listening" && "Listening — speak to the patient"}
          {status === "speaking" && "Patient is speaking…"}
          {status === "error" && "Connection failed"}
          {status === "ended" && "Session ended"}
        </span>
      </div>

      {status === "error" && error && (
        <div className="modules-sim-runner__error">{error}</div>
      )}

      {transcript.length > 0 && (
        <div className="modules-sim-runner__transcript">
          {transcript.slice(-6).map((line, i) => (
            <p key={`${i}-${line.slice(0, 20)}`}>{line}</p>
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
              className="modules-btn modules-btn--secondary"
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
      </div>
    </div>
  );
}
