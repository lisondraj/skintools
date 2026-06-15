export type VspDifficulty = "easy" | "moderate" | "challenging";

export interface VspConfig {
  persona: string;
  scenario: string;
  difficulty: VspDifficulty;
  /** Consultation time limit in minutes (2–20). Default 5. */
  timeLimitMinutes?: number;
}

export type VspRole = "clinician" | "patient";

export interface VspTurn {
  role: VspRole;
  text: string;
  at: number;
}

export interface VspSession {
  id: string;
  createdAt: number;
  config: VspConfig;
  durationSec: number;
  transcript: VspTurn[];
}
