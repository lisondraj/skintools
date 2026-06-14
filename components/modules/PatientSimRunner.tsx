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

export function PatientSimRunner({ sim, onEnd, autoStart = false }: Props) {
  const [status, setStatus] = useState<SimStatus>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError("");
    setStatus("connecting");

    try {
      const session = await createRealtimeSession({ sim });
      const model = session.model;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0] ?? null;
        setStatus("listening");
      };

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            delta?: string;
            transcript?: string;
          };
          if (msg.type === "response.audio_transcript.delta" && msg.delta) {
            setStatus("speaking");
          }
          if (
            msg.type === "response.audio_transcript.done" &&
            msg.transcript
          ) {
            setTranscript((prev) => [...prev, `Patient: ${msg.transcript}`]);
            setStatus("listening");
          }
          if (msg.type === "conversation.item.input_audio_transcription.completed") {
            const text = (msg as { transcript?: string }).transcript;
            if (text) setTranscript((prev) => [...prev, `You: ${text}`]);
          }
        } catch {
          /* ignore malformed events */
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );

      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(`WebRTC failed (${sdpRes.status}): ${errText}`);
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      setStatus("listening");
    } catch (err) {
      cleanup();
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not start simulation.");
    }
  }, [cleanup, sim]);

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      void start();
    }
  }, [autoStart, start]);

  useEffect(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
  }, [muted]);

  function handleEnd() {
    cleanup();
    setStatus("ended");
    onEnd();
  }

  return (
    <div className="modules-sim-runner">
      <div className="modules-sim-runner__status">
        {status === "idle" && "Ready to start patient conversation"}
        {status === "connecting" && "Connecting…"}
        {status === "listening" && "Listening — speak to the patient"}
        {status === "speaking" && "Patient is speaking…"}
        {status === "error" && error}
        {status === "ended" && "Session ended"}
      </div>

      {transcript.length > 0 && (
        <div className="modules-sim-runner__transcript">
          {transcript.slice(-6).map((line, i) => (
            <p key={`${i}-${line.slice(0, 12)}`}>{line}</p>
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
          <button type="button" className="modules-btn" onClick={() => void start()}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
