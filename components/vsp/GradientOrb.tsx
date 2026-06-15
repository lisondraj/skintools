"use client";

type SimStatus = "idle" | "connecting" | "listening" | "speaking" | "error" | "ended";

type Props = {
  level: number;
  status: SimStatus;
  micOpen: boolean;
};

export function GradientOrb({ level, status }: Props) {
  const active = status === "listening" || status === "speaking";
  const scale = 1 + level * 0.32;
  const animDuration = Math.max(0.7, 2.8 - level * 2.2);
  const ringScale = 1 + level * 0.5;

  return (
    <div className="vsp-grad-orb" aria-hidden>
      <span
        className="vsp-grad-orb__ring"
        style={{
          transform: `scale(${ringScale})`,
          opacity: active ? 0.2 + level * 0.35 : 0.1,
        }}
      />
      <span
        className="vsp-grad-orb__scale"
        style={{ transform: `scale(${scale})` }}
      >
        <span
          className={`vsp-grad-orb__core${active ? " is-active" : ""}`}
          style={{
            animationDuration: active ? `${animDuration}s, ${animDuration * 0.5}s` : "3s",
            opacity: status === "ended" ? 0.35 : status === "error" ? 0.5 : 0.95,
          }}
        />
      </span>
    </div>
  );
}
