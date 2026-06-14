"use client";

import { forwardRef, type Ref } from "react";
import { ImageStage } from "@/components/remorph/ImageStage";
import type { MaskCanvasHandle } from "@/components/remorph/MaskCanvas";
import type { RemorphComparePane } from "@/lib/remorph/types";

type SplitStageProps = {
  left: RemorphComparePane;
  right: RemorphComparePane;
  editTarget: "left" | "right";
  onSelectTarget: (target: "left" | "right") => void;
  brushSize: number;
  brushMode: "paint" | "erase";
  disabled?: boolean;
};

export const SplitStage = forwardRef<MaskCanvasHandle, SplitStageProps>(
  function SplitStage(
    {
      left,
      right,
      editTarget,
      onSelectTarget,
      brushSize,
      brushMode,
      disabled = false,
    },
    ref,
  ) {
    return (
      <div className="remorph-split">
        <SplitPane
          pane={left}
          side="left"
          isActive={editTarget === "left"}
          onSelect={() => onSelectTarget("left")}
          brushSize={brushSize}
          brushMode={brushMode}
          disabled={disabled}
          maskRef={editTarget === "left" ? ref : undefined}
        />
        <SplitPane
          pane={right}
          side="right"
          isActive={editTarget === "right"}
          onSelect={() => onSelectTarget("right")}
          brushSize={brushSize}
          brushMode={brushMode}
          disabled={disabled}
          maskRef={editTarget === "right" ? ref : undefined}
        />
      </div>
    );
  },
);

type SplitPaneProps = {
  pane: RemorphComparePane;
  side: "left" | "right";
  isActive: boolean;
  onSelect: () => void;
  brushSize: number;
  brushMode: "paint" | "erase";
  disabled?: boolean;
  maskRef?: Ref<MaskCanvasHandle>;
};

function SplitPane({
  pane,
  side,
  isActive,
  onSelect,
  brushSize,
  brushMode,
  disabled = false,
  maskRef,
}: SplitPaneProps) {
  return (
    <button
      type="button"
      className={`remorph-split__pane ${isActive ? "is-active" : ""}`}
      onClick={onSelect}
      aria-pressed={isActive}
      aria-label={`${side} pane${isActive ? " (selected)" : ""}`}
    >
      {isActive ? (
        <ImageStage
          ref={maskRef}
          image={pane.image}
          brushSize={brushSize}
          brushMode={brushMode}
          disabled={disabled}
        />
      ) : (
        <div className="remorph-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pane.image}
            alt={pane.label}
            className="remorph-stage__image"
          />
        </div>
      )}
    </button>
  );
}
