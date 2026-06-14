"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { buildMaskFromSelection } from "@/lib/remorph/image-utils";
import {
  buildCategoryMasks,
  hitTestRegion,
} from "@/lib/remorph/segment-utils";
import type { RemorphRegion } from "@/lib/remorph/types";
import { REMORPH_STAGE_SIZE } from "@/lib/remorph/types";

export type FeatureSelectHandle = {
  clear: () => void;
  hasSelection: () => boolean;
  exportMask: () => { mask: string | null; hasSelection: boolean };
};

type FeatureSelectCanvasProps = {
  regions: RemorphRegion[];
  disabled?: boolean;
  onSelectionChange?: (hasSelection: boolean) => void;
  onHoverCategoryChange?: (category: string | null, label: string | null) => void;
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
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = REMORPH_STAGE_SIZE;
  const overlay = ctx.createImageData(size, size);

  for (let i = 0; i < size * size; i++) {
    const committedActive = committed[i] === 1;
    const hoverActive = hover?.[i] === 1 && !committedActive;
    if (!committedActive && !hoverActive) continue;

    const oi = i * 4;
    overlay.data[oi] = 255;
    overlay.data[oi + 1] = 60;
    overlay.data[oi + 2] = 60;
    overlay.data[oi + 3] = committedActive ? 110 : 70;
  }

  ctx.clearRect(0, 0, size, size);
  ctx.putImageData(overlay, 0, 0);
}

export const FeatureSelectCanvas = forwardRef<
  FeatureSelectHandle,
  FeatureSelectCanvasProps
>(function FeatureSelectCanvas(
  {
    regions,
    disabled = false,
    onSelectionChange,
    onHoverCategoryChange,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const committedRef = useRef<Uint8Array>(
    new Uint8Array(REMORPH_STAGE_SIZE * REMORPH_STAGE_SIZE),
  );
  const hoverRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);

  const categoryMasks = useMemo(
    () => buildCategoryMasks(regions),
    [regions],
  );

  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderMaskOverlay(canvas, committedRef.current, hoverRef.current);
  }, []);

  const clear = useCallback(() => {
    committedRef.current = new Uint8Array(
      REMORPH_STAGE_SIZE * REMORPH_STAGE_SIZE,
    );
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
        REMORPH_STAGE_SIZE,
        REMORPH_STAGE_SIZE,
      );
      return { mask: hasSelection ? mask : null, hasSelection };
    },
  }));

  useEffect(() => {
    committedRef.current = new Uint8Array(
      REMORPH_STAGE_SIZE * REMORPH_STAGE_SIZE,
    );
    hoverRef.current = null;
    renderOverlay();
    onSelectionChange?.(false);
    onHoverCategoryChange?.(null, null);
  }, [regions, onHoverCategoryChange, onSelectionChange, renderOverlay]);

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
      if (!canvas || disabled || regions.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const nx = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width),
      );
      const ny = Math.min(
        1,
        Math.max(0, (clientY - rect.top) / rect.height),
      );

      const hit = hitTestRegion(regions, nx, ny);
      if (!hit) {
        hoverRef.current = null;
        onHoverCategoryChange?.(null, null);
        renderOverlay();
        return;
      }

      const categoryMask = categoryMasks.get(hit.category);
      hoverRef.current = categoryMask ? new Uint8Array(categoryMask) : null;
      onHoverCategoryChange?.(hit.category, hit.label);
      renderOverlay();
    },
    [categoryMasks, disabled, onHoverCategoryChange, regions, renderOverlay],
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
      if (!canvas || disabled || regions.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const nx = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width),
      );
      const ny = Math.min(
        1,
        Math.max(0, (clientY - rect.top) / rect.height),
      );

      const hit = hitTestRegion(regions, nx, ny);
      if (!hit) return;

      const categoryMask = categoryMasks.get(hit.category);
      if (!categoryMask) return;

      mergeSelection(committedRef.current, categoryMask);
      renderOverlay();
      onSelectionChange?.(countSelected(committedRef.current));
    },
    [categoryMasks, disabled, onSelectionChange, regions, renderOverlay],
  );

  return (
    <canvas
      ref={canvasRef}
      className="remorph-stage__select"
      aria-label="Hover to highlight feature types, click to select"
      onPointerMove={(event) => {
        if (disabled) return;
        scheduleHoverUpdate(event.clientX, event.clientY);
      }}
      onPointerLeave={() => {
        hoverRef.current = null;
        onHoverCategoryChange?.(null, null);
        renderOverlay();
      }}
      onClick={(event) => {
        if (disabled) return;
        handleClick(event.clientX, event.clientY);
      }}
    />
  );
});
