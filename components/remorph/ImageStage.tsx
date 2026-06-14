"use client";

import { forwardRef } from "react";
import {
  FeatureSelectCanvas,
  type FeatureSelectHandle,
} from "@/components/remorph/FeatureSelectCanvas";

type ImageStageProps = {
  image: string;
  tolerance: number;
  disabled?: boolean;
  onSelectionChange?: (hasSelection: boolean) => void;
};

export const ImageStage = forwardRef<FeatureSelectHandle, ImageStageProps>(
  function ImageStage(
    { image, tolerance, disabled = false, onSelectionChange },
    ref,
  ) {
    return (
      <div className="remorph-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Current image" className="remorph-stage__image" />
        <FeatureSelectCanvas
          ref={ref}
          image={image}
          tolerance={tolerance}
          disabled={disabled}
          onSelectionChange={onSelectionChange}
        />
      </div>
    );
  },
);
