"use client";

import { forwardRef } from "react";
import {
  FeatureSelectCanvas,
  type FeatureSelectHandle,
} from "@/components/remorph/FeatureSelectCanvas";
import type { RemorphRegion } from "@/lib/remorph/types";

type ImageStageProps = {
  image: string;
  regions: RemorphRegion[];
  disabled?: boolean;
  onSelectionChange?: (hasSelection: boolean) => void;
  onHoverCategoryChange?: (category: string | null, label: string | null) => void;
};

export const ImageStage = forwardRef<FeatureSelectHandle, ImageStageProps>(
  function ImageStage(
    {
      image,
      regions,
      disabled = false,
      onSelectionChange,
      onHoverCategoryChange,
    },
    ref,
  ) {
    return (
      <div className="remorph-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Current image" className="remorph-stage__image" />
        <FeatureSelectCanvas
          ref={ref}
          regions={regions}
          disabled={disabled}
          onSelectionChange={onSelectionChange}
          onHoverCategoryChange={onHoverCategoryChange}
        />
      </div>
    );
  },
);
