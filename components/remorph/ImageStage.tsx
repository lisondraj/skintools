"use client";

import { forwardRef } from "react";
import { MaskCanvas, type MaskCanvasHandle } from "@/components/remorph/MaskCanvas";

type ImageStageProps = {
  image: string;
  brushSize: number;
  brushMode: "paint" | "erase";
  disabled?: boolean;
};

export const ImageStage = forwardRef<MaskCanvasHandle, ImageStageProps>(
  function ImageStage({ image, brushSize, brushMode, disabled = false }, ref) {
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
      </div>
    );
  },
);
