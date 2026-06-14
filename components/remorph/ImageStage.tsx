"use client";

import { forwardRef } from "react";
import {
  FeatureSelectCanvas,
  type FeatureSelectHandle,
} from "@/components/remorph/FeatureSelectCanvas";
import type { RemorphFeature } from "@/lib/remorph/types";

type ImageStageProps = {
  image: string;
  features: RemorphFeature[];
  disabled?: boolean;
  onSelectionChange?: (hasSelection: boolean) => void;
  onHoverCategoryChange?: (category: string | null, label: string | null) => void;
  onMasksReady?: (ready: boolean) => void;
};

export const ImageStage = forwardRef<FeatureSelectHandle, ImageStageProps>(
  function ImageStage(
    {
      image,
      features,
      disabled = false,
      onSelectionChange,
      onHoverCategoryChange,
      onMasksReady,
    },
    ref,
  ) {
    return (
      <div className="remorph-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Current image" className="remorph-stage__image" />
        <FeatureSelectCanvas
          ref={ref}
          image={image}
          features={features}
          disabled={disabled}
          onSelectionChange={onSelectionChange}
          onHoverCategoryChange={onHoverCategoryChange}
          onMasksReady={onMasksReady}
        />
      </div>
    );
  },
);
