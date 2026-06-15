import type { PatientSimConfig } from "./types";

export function getRealtimeModel(): string {
  return (
    process.env["OPENAI_REALTIME_MODEL"]?.trim() ||
    "gpt-realtime"
  );
}

export function getDefaultRealtimeVoice(): string {
  return process.env["OPENAI_REALTIME_VOICE"]?.trim() || "alloy";
}

export function getSimTimeLimitMinutes(sim: PatientSimConfig): number {
  const value = sim.timeLimitMinutes ?? 5;
  return Math.min(Math.max(value, 2), 20);
}

export function getSimTimeLimitSeconds(sim: PatientSimConfig): number {
  return getSimTimeLimitMinutes(sim) * 60;
}

const DIFFICULTY_GUIDE: Record<PatientSimConfig["difficulty"], string> = {
  easy:
    "Be cooperative, ask straightforward questions, and respond clearly to explanations.",
  moderate:
    "Show mild anxiety, ask follow-up questions, and occasionally need reassurance.",
  challenging:
    "Express worry, push back on jargon, ask 'what if' questions, and need empathy before accepting advice.",
};

export function buildPatientInstructions(sim: PatientSimConfig): string {
  const minutes = getSimTimeLimitMinutes(sim);
  const wrapStart = Math.max(1, Math.ceil(minutes * 0.75));

  return `You are role-playing as a virtual patient in a dermatology communication practice session.

Persona: ${sim.persona}
Scenario: ${sim.scenario}
Difficulty: ${sim.difficulty} — ${DIFFICULTY_GUIDE[sim.difficulty]}

Session time limit: ${minutes} minutes total.

Conversation structure:
- Opening (first ~25%): greet briefly, then share concerns from the scenario when the clinician speaks.
- Middle (~25–75%): respond naturally to questions; stay in character; reference details from the scenario and persona.
- Wrap-up (after ~${wrapStart} min / final 25%): start consolidating what you heard, ask any final questions, express thanks.
- Final minute: bring the visit to a natural close even if topics remain — say goodbye in character.

Rules:
- Stay in character as the patient at all times
- Speak in plain, conversational language (1–3 sentences per turn unless asked for more)
- Do NOT give medical advice or act as a clinician
- React naturally to the learner's tone, clarity, and empathy
- If the learner uses confusing medical jargon, ask them to explain in simpler terms
- When the clinician's microphone is muted, they are thinking — stay silent and do not speak until they unmute
- When contextual updates mention remaining time or wrap-up, follow them immediately
- Keep responses appropriate for a professional training simulation`;
}

export type SimSessionPhase = "opening" | "middle" | "wrap-up" | "final";

export function getSimSessionPhase(elapsedSec: number, totalSec: number): SimSessionPhase {
  if (totalSec <= 0) return "opening";
  const ratio = elapsedSec / totalSec;
  if (ratio >= 0.92) return "final";
  if (ratio >= 0.75) return "wrap-up";
  if (ratio >= 0.25) return "middle";
  return "opening";
}

export function buildSessionContextUpdate(
  sim: PatientSimConfig,
  elapsedSec: number,
  totalSec: number,
  micOpen: boolean,
): string {
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const remainingMin = Math.ceil(remainingSec / 60);
  const phase = getSimSessionPhase(elapsedSec, totalSec);

  const micNote = micOpen
    ? "Clinician microphone is ON — they are speaking. Listen; respond only after they finish and mute."
    : "Clinician microphone is OFF — they are thinking or listening. Do NOT speak until their microphone is on.";

  const phaseNotes: Record<SimSessionPhase, string> = {
    opening:
      "Phase: opening. Brief responses; let the clinician lead. Remember persona and scenario details.",
    middle:
      "Phase: middle of visit. Stay in character; reference scenario details; match difficulty level.",
    "wrap-up":
      `Phase: wrap-up (~${remainingMin} min left). Begin closing — summarize understanding, final questions, thank the clinician.`,
    final:
      `Phase: final minute (${remainingSec}s left). End the visit now with a brief, natural goodbye in character.`,
  };

  return `[Session context — ${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, "0")} elapsed, ~${remainingMin} min remaining]
Persona reminder: ${sim.persona}
Scenario reminder: ${sim.scenario}
${phaseNotes[phase]}
${micNote}`;
}

export function buildWrapUpContextUpdate(sim: PatientSimConfig, kind: "warning" | "urgent" | "end"): string {
  const minutes = getSimTimeLimitMinutes(sim);
  switch (kind) {
    case "warning":
      return `[Time check] About ${Math.ceil(minutes * 0.25)} minutes remain in this ${minutes}-minute session. Begin transitioning toward wrap-up: confirm understanding, ask any last questions, thank the clinician. Stay in character as: ${sim.persona}`;
    case "urgent":
      return `[Time check] Final minute approaching. Wrap up the consultation now — one or two closing sentences, then a warm goodbye. Scenario: ${sim.scenario}`;
    case "end":
      return `[Session ended — time limit reached] Say a brief, natural goodbye in character and end the visit immediately. Do not start new topics. Persona: ${sim.persona}`;
  }
}

export function formatSimCountdown(remainingSec: number): string {
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
