"use client";

import type { LoadingUpdate } from "@/lib/modules/loading-progress";

type Props = {
  loading: LoadingUpdate | null;
};

export function ModulesLoadingOverlay({ loading }: Props) {
  if (!loading) return null;

  return (
    <div className="modules-loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="modules-loading-overlay__card">
        <span className="modules-spinner modules-loading-overlay__spinner" aria-hidden />
        <p className="modules-loading-overlay__label">{loading.label}</p>
        <div className="modules-loading-overlay__track">
          <span
            className="modules-loading-overlay__fill"
            style={{ width: `${loading.progress}%` }}
          />
        </div>
        <span className="modules-loading-overlay__pct">{loading.progress}%</span>
      </div>
    </div>
  );
}
