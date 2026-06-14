"use client";

import type { RemorphQualityMode } from "@/lib/remorph/types";

type QualityModeToggleProps = {
  value: RemorphQualityMode;
  onChange: (mode: RemorphQualityMode) => void;
  disabled?: boolean;
};

export function QualityModeToggle({
  value,
  onChange,
  disabled = false,
}: QualityModeToggleProps) {
  return (
    <div className="remorph-quality" role="group" aria-label="Generation quality">
      <button
        type="button"
        className={`remorph-quality__btn ${value === "fast" ? "is-active" : ""}`}
        onClick={() => onChange("fast")}
        disabled={disabled}
        aria-pressed={value === "fast"}
      >
        Fast
      </button>
      <button
        type="button"
        className={`remorph-quality__btn ${value === "quality" ? "is-active" : ""}`}
        onClick={() => onChange("quality")}
        disabled={disabled}
        aria-pressed={value === "quality"}
      >
        Quality
      </button>
    </div>
  );
}
