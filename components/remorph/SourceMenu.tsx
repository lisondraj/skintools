"use client";

import { useEffect, useRef, useState } from "react";

type SourceMenuProps = {
  onUpload: () => void;
  onPrompt: () => void;
  onSplitFromHistory: () => void;
  disabled?: boolean;
  hasImage: boolean;
};

export function SourceMenu({
  onUpload,
  onPrompt,
  onSplitFromHistory,
  disabled = false,
  hasImage,
}: SourceMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="remorph-source-menu" ref={rootRef}>
      <button
        type="button"
        className="remorph-source-menu__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
      >
        +
      </button>

      {open && (
        <div className="remorph-source-menu__dropdown" role="menu">
          <button
            type="button"
            className="remorph-source-menu__item"
            role="menuitem"
            onClick={() => run(onUpload)}
          >
            Upload image
          </button>
          <button
            type="button"
            className="remorph-source-menu__item"
            role="menuitem"
            onClick={() => run(onPrompt)}
          >
            Prompt image
          </button>
          <button
            type="button"
            className="remorph-source-menu__item"
            role="menuitem"
            onClick={() => run(onSplitFromHistory)}
          >
            {hasImage
              ? "Drag from history to add side by side"
              : "Drag from history below"}
          </button>
        </div>
      )}
    </div>
  );
}
