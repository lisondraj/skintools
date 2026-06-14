"use client";

import { forwardRef } from "react";
import { LoadingState } from "@/components/remorph/LoadingState";
import { MaskCanvas, type MaskCanvasHandle } from "@/components/remorph/MaskCanvas";

type ImageStageProps = {
  image: string;
  brushSize: number;
  brushMode: "paint" | "erase";
  disabled?: boolean;
  loading?: boolean;
  hoverLabel?: string;
};

export const ImageStage = forwardRef<MaskCanvasHandle, ImageStageProps>(
  function ImageStage(
    {
      image,
      brushSize,
      brushMode,
      disabled = false,
      loading = false,
      hoverLabel,
    },
    ref,
  ) {
    return (
      <div className="remorph-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Current image" className="remorph-stage__image" />
        <MaskCanvas
          ref={ref}
          brushSize={brushSize}
          brushMode={brushMode}
          disabled={disabled}
        />
        {hoverLabel && (
          <span className="remorph-stage__hover-label">{hoverLabel}</span>
        )}
        {loading && (
          <div className="remorph-stage__loading">
            <LoadingState variant="overlay" />
          </div>
        )}
      </div>
    );
  },
);
