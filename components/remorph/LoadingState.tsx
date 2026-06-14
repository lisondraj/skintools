type LoadingStateProps = {
  label?: string;
  variant?: "inline" | "overlay" | "button";
  className?: string;
};

export function LoadingState({
  label = "Working...",
  variant = "inline",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`remorph-loader remorph-loader--${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="remorph-loader__icon" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none">
          <circle
            className="remorph-loader__track"
            cx="12"
            cy="12"
            r="9"
            strokeWidth="2"
          />
          <circle
            className="remorph-loader__arc"
            cx="12"
            cy="12"
            r="9"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="remorph-loader__label">{label}</span>
    </div>
  );
}
