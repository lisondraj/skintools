"use client";

import type { ScanMode } from "@/lib/skinlog/types";

type ModeToggleProps = {
  value: ScanMode;
  onChange: (mode: ScanMode) => void;
  disabled?: boolean;
};

export function ModeToggle({ value, onChange, disabled }: ModeToggleProps) {
  return (
    <div className="skinlog-mode-toggle" role="tablist" aria-label="Scan mode">
      <button
        type="button"
        role="tab"
        aria-selected={value === "single"}
        className={`skinlog-mode-toggle__btn${
          value === "single" ? " is-active" : ""
        }`}
        disabled={disabled}
        onClick={() => onChange("single")}
      >
        Single lesion
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "full-body"}
        className={`skinlog-mode-toggle__btn${
          value === "full-body" ? " is-active" : ""
        }`}
        disabled={disabled}
        onClick={() => onChange("full-body")}
      >
        Full body
      </button>
    </div>
  );
}
