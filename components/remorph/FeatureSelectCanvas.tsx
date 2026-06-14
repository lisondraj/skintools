"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { buildMaskFromSelection } from "@/lib/remorph/image-utils";
import {
  buildFeatureMasks,
  computeSkinMask,
  getImagePixels,
  hitTestFeatureAt,
} from "@/lib/remorph/segment-utils";
import type { RemorphFeature } from "@/lib/remorph/types";
import {
  REMORPH_SEG_RES,
  REMORPH_SKIN_CATEGORY,
  REMORPH_STAGE_SIZE,
} from "@/lib/remorph/types";

export type FeatureSelectHandle = {
  clear: () => void;
  hasSelection: () => boolean;
  exportMask: () => { mask: string | null; hasSelection: boolean };
};

type FeatureSelectCanvasProps = {
  image: string;
  features: RemorphFeature[];
  disabled?: boolean;
  onSelectionChange?: (hasSelection: boolean) => void;
  onHoverCategoryChange?: (category: string | null, label: string | null) => void;
  onMasksReady?: (ready: boolean) => void;
};

function mergeSelection(target: Uint8Array, source: Uint8Array): void {
  for (let i = 0; i < target.length; i++) {
    if (source[i]) target[i] = 1;
  }
}

function countSelected(selection: Uint8Array): boolean {
  for (let i = 0; i < selection.length; i++) {
    if (selection[i]) return true;
  }
  return false;
}

function renderMaskOverlay(
  canvas: HTMLCanvasElement,
  committed: Uint8Array,
  hover: Uint8Array | null,
  segSize: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const overlay = ctx.createImageData(segSize, segSize);

  for (let i = 0; i < segSize * segSize; i++) {
    const committedActive = committed[i] === 1;
    const hoverActive = hover?.[i] === 1 && !committedActive;
    if (!committedActive && !hoverActive) continue;

    const oi = i * 4;
    overlay.data[oi] = 255;
    overlay.data[oi + 1] = 60;
    overlay.data[oi + 2] = 60;
    overlay.data[oi + 3] = committedActive ? 110 : 70;
  }

  const scratch = document.createElement("canvas");
  scratch.width = segSize;
  scratch.height = segSize;
  const scratchCtx = scratch.getContext("2d");
  if (!scratchCtx) return;
  scratchCtx.putImageData(overlay, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scratch, 0, 0, REMORPH_STAGE_SIZE, REMORPH_STAGE_SIZE);
}

export const FeatureSelectCanvas = forwardRef<
  FeatureSelectHandle,
  FeatureSelectCanvasProps
>(function FeatureSelectCanvas(
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const committedRef = useRef<Uint8Array>(
    new Uint8Array(REMORPH_SEG_RES * REMORPH_SEG_RES),
  );
  const hoverRef = useRef<Uint8Array | null>(null);
  const featureMasksRef = useRef<Map<string, Uint8Array>>(new Map());
  const categoryMasksRef = useRef<Map<string, Uint8Array>>(new Map());
  const rafRef = useRef<number | null>(null);
  const [masksReady, setMasksReady] = useState(false);

  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderMaskOverlay(
      canvas,
      committedRef.current,
      hoverRef.current,
      REMORPH_SEG_RES,
    );
  }, []);

  const clear = useCallback(() => {
    committedRef.current = new Uint8Array(REMORPH_SEG_RES * REMORPH_SEG_RES);
    hoverRef.current = null;
    renderOverlay();
    onSelectionChange?.(false);
    onHoverCategoryChange?.(null, null);
  }, [onHoverCategoryChange, onSelectionChange, renderOverlay]);

  useImperativeHandle(ref, () => ({
    clear,
    hasSelection: () => countSelected(committedRef.current),
    exportMask: () => {
      const { mask, hasSelection } = buildMaskFromSelection(
        committedRef.current,
        REMORPH_SEG_RES,
        REMORPH_SEG_RES,
        REMORPH_STAGE_SIZE,
      );
      return { mask: hasSelection ? mask : null, hasSelection };
    },
  }));

  useEffect(() => {
    let cancelled = false;
    setMasksReady(false);
    onMasksReady?.(false);

    committedRef.current = new Uint8Array(REMORPH_SEG_RES * REMORPH_SEG_RES);
    hoverRef.current = null;
    featureMasksRef.current = new Map();
    categoryMasksRef.current = new Map();
    renderOverlay();
    onSelectionChange?.(false);
    onHoverCategoryChange?.(null, null);

    async function prepareMasks() {
      try {
        const pixels = await getImagePixels(image, REMORPH_SEG_RES);
        if (cancelled) return;

        const { featureMasks, categoryMasks } = buildFeatureMasks(
          features,
          pixels,
          REMORPH_SEG_RES,
        );
        const skinMask = computeSkinMask(categoryMasks, REMORPH_SEG_RES);
        categoryMasks.set(REMORPH_SKIN_CATEGORY, skinMask);

        if (cancelled) return;
        featureMasksRef.current = featureMasks;
        categoryMasksRef.current = categoryMasks;
        setMasksReady(true);
        onMasksReady?.(true);
        renderOverlay();
      } catch {
        if (!cancelled) {
          setMasksReady(false);
          onMasksReady?.(false);
        }
      }
    }

    void prepareMasks();

    return () => {
      cancelled = true;
    };
  }, [
    features,
    image,
    onHoverCategoryChange,
    onMasksReady,
    onSelectionChange,
    renderOverlay,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = REMORPH_STAGE_SIZE;
    canvas.height = REMORPH_STAGE_SIZE;
    renderOverlay();
  }, [renderOverlay]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const updateHover = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || disabled || !masksReady) return;

      const rect = canvas.getBoundingClientRect();
      const nx = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width),
      );
      const ny = Math.min(
        1,
        Math.max(0, (clientY - rect.top) / rect.height),
      );

      const hit = hitTestFeatureAt(
        featureMasksRef.current,
        features,
        categoryMasksRef.current,
        nx,
        ny,
        REMORPH_SEG_RES,
      );

      const categoryMask = categoryMasksRef.current.get(hit.category);
      hoverRef.current = categoryMask ? new Uint8Array(categoryMask) : null;
      onHoverCategoryChange?.(hit.category, hit.label);
      renderOverlay();
    },
    [disabled, features, masksReady, onHoverCategoryChange, renderOverlay],
  );

  const scheduleHoverUpdate = useCallback(
    (clientX: number, clientY: number) => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        updateHover(clientX, clientY);
      });
    },
    [updateHover],
  );

  const handleClick = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || disabled || !masksReady) return;

      const rect = canvas.getBoundingClientRect();
      const nx = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width),
      );
      const ny = Math.min(
        1,
        Math.max(0, (clientY - rect.top) / rect.height),
      );

      const hit = hitTestFeatureAt(
        featureMasksRef.current,
        features,
        categoryMasksRef.current,
        nx,
        ny,
        REMORPH_SEG_RES,
      );

      const categoryMask = categoryMasksRef.current.get(hit.category);
      if (!categoryMask) return;

      mergeSelection(committedRef.current, categoryMask);
      renderOverlay();
      onSelectionChange?.(countSelected(committedRef.current));
    },
    [disabled, features, masksReady, onSelectionChange, renderOverlay],
  );

  return (
    <canvas
      ref={canvasRef}
      className="remorph-stage__select"
      aria-label="Hover to highlight feature types, click to select"
      onPointerMove={(event) => {
        if (disabled || !masksReady) return;
        scheduleHoverUpdate(event.clientX, event.clientY);
      }}
      onPointerLeave={() => {
        hoverRef.current = null;
        onHoverCategoryChange?.(null, null);
        renderOverlay();
      }}
      onClick={(event) => {
        if (disabled || !masksReady) return;
        handleClick(event.clientX, event.clientY);
      }}
    />
  );
});
