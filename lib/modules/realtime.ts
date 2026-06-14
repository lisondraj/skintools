import type { PatientSimConfig } from "./types";

export function getRealtimeModel(): string {
  return (
    process.env["OPENAI_REALTIME_MODEL"]?.trim() ||
    "gpt-4o-realtime-preview"
  );
}

export function getDefaultRealtimeVoice(): string {
  return process.env["OPENAI_REALTIME_VOICE"]?.trim() || "alloy";
}

export function buildPatientInstructions(sim: PatientSimConfig): string {
  const difficultyGuide: Record<PatientSimConfig["difficulty"], string> = {
    easy:
      "Be cooperative, ask straightforward questions, and respond clearly to explanations.",
    moderate:
      "Show mild anxiety, ask follow-up questions, and occasionally need reassurance.",
    challenging:
      "Express worry, push back on jargon, ask 'what if' questions, and need empathy before accepting advice.",
  };

  return `You are role-playing as a virtual patient in a dermatology communication practice session.

Persona: ${sim.persona}
Scenario: ${sim.scenario}
Difficulty: ${sim.difficulty} — ${difficultyGuide[sim.difficulty]}

Rules:
- Stay in character as the patient at all times
- Speak in plain, conversational language (1-3 sentences per turn unless asked for more)
- Do NOT give medical advice or act as a clinician
- React naturally to the learner's tone, clarity, and empathy
- If the learner uses confusing medical jargon, ask them to explain in simpler terms
- Keep responses appropriate for a professional training simulation`;
}
