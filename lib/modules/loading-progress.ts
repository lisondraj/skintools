export type LoadingPhase = {
  label: string;
  /** Progress threshold (0–100) at which this label becomes active. */
  until: number;
};

export type LoadingUpdate = {
  label: string;
  progress: number;
};

export const DECK_LOADING_PHASES: LoadingPhase[] = [
  { label: "Building slide deck", until: 0 },
  { label: "Adding images", until: 38 },
  { label: "Adjusting theme", until: 72 },
  { label: "Finishing up", until: 90 },
];

export const SLIDE_LOADING_PHASES: LoadingPhase[] = [
  { label: "Planning layout", until: 0 },
  { label: "Writing content", until: 28 },
  { label: "Adding images", until: 58 },
  { label: "Applying theme", until: 82 },
];

function labelForProgress(phases: LoadingPhase[], progress: number): string {
  let label = phases[0]?.label ?? "Working…";
  for (const phase of phases) {
    if (progress >= phase.until) label = phase.label;
  }
  return label;
}

export function startSimulatedProgress(
  phases: LoadingPhase[],
  onUpdate: (update: LoadingUpdate) => void,
): () => void {
  let progress = 0;
  onUpdate({ label: labelForProgress(phases, progress), progress });

  const interval = setInterval(() => {
    const bump = progress < 50 ? 2.4 : progress < 80 ? 1.2 : 0.5;
    progress = Math.min(progress + bump, 92);
    onUpdate({ label: labelForProgress(phases, progress), progress: Math.round(progress) });
  }, 450);

  return () => clearInterval(interval);
}

export async function runWithLoadingProgress<T>(
  phases: LoadingPhase[],
  onUpdate: (update: LoadingUpdate | null) => void,
  fn: () => Promise<T>,
): Promise<T> {
  const stop = startSimulatedProgress(phases, onUpdate);
  try {
    const result = await fn();
    onUpdate({ label: phases[phases.length - 1]?.label ?? "Done", progress: 100 });
    await new Promise((r) => setTimeout(r, 280));
    return result;
  } finally {
    stop();
    onUpdate(null);
  }
}

export async function runWithLoadingLabel<T>(
  label: string,
  onUpdate: (update: LoadingUpdate | null) => void,
  fn: () => Promise<T>,
): Promise<T> {
  return runWithLoadingProgress([{ label, until: 0 }], onUpdate, fn);
}
