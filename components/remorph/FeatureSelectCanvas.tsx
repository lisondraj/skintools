"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  REMORPH_WORK_SIZE,
  buildMaskFromSelection,
  getStagePixels,
  selectSimilar,
} from "@/lib/remorph/image-utils";
import { REMORPH_STAGE_SIZE } from "@/lib/remorph/types";

export type FeatureSelectHandle = {
  clear: () => void;
  hasSelection: () => boolean;
  exportMask: () => { mask: string | null; hasSelection: boolean };
};

type FeatureSelectCanvasProps = {
  image: string;
  tolerance: number;
  disabled?: boolean;
  onSelectionChange?: (hasSelection: boolean) => void;
};

function mergeSelection(
  target: Uint8Array,
  source: Uint8Array,
): boolean {
  let changed = false;
  for (let i = 0; i < target.length; i++) {
    if (source[i] && !target[i]) {
      target[i] = 1;
      changed = true;
    }
  }
  return changed;
}

function countSelected(selection: Uint8Array): boolean {
  for (let i = 0; i < selection.length; i++) {
    if (selection[i]) return true;
  }
  return false;
}

export const FeatureSelectCanvas = forwardRef<
  FeatureSelectHandle,
  FeatureSelectCanvasProps
>(function FeatureSelectCanvas(
  { image, tolerance, disabled = false, onSelectionChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workPixelsRef = useRef<ImageData | null>(null);
  const fullPixelsRef = useRef<ImageData | null>(null);
  const committedRef = useRef<Uint8Array>(
    new Uint8Array(REMORPH_STAGE_SIZE * REMORPH_STAGE_SIZE),
  );
  const hoverRef = useRef<Uint8Array | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const toleranceRef = useRef(tolerance);

  toleranceRef.current = tolerance;

  const renderOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const workPixels = workPixelsRef.current;
    if (!canvas || !workPixels) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const workSize = REMORPH_WORK_SIZE;
    const overlay = ctx.createImageData(workSize, workSize);
    const committed = committedRef.current;
    const hover = hoverRef.current;
    const scale = REMORPH_STAGE_SIZE / workSize;

    for (let wy = 0; wy < workSize; wy++) {
      for (let wx = 0; wx < workSize; wx++) {
        const i = wy * workSize + wx;
        let committedActive = false;
        const fx0 = Math.floor(wx * scale);
        const fy0 = Math.floor(wy * scale);
        const fx1 = Math.min(REMORPH_STAGE_SIZE, Math.floor((wx + 1) * scale));
        const fy1 = Math.min(REMORPH_STAGE_SIZE, Math.floor((wy + 1) * scale));

        outer: for (let fy = fy0; fy < fy1; fy++) {
          for (let fx = fx0; fx < fx1; fx++) {
            if (committed[fy * REMORPH_STAGE_SIZE + fx]) {
              committedActive = true;
              break outer;
            }
          }
        }

        const active = committedActive || (hover?.[i] ?? 0);
        const oi = i * 4;
        if (active) {
          overlay.data[oi] = 255;
          overlay.data[oi + 1] = 60;
          overlay.data[oi + 2] = 60;
          overlay.data[oi + 3] = committedActive ? 110 : 70;
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scratch = document.createElement("canvas");
    scratch.width = workSize;
    scratch.height = workSize;
    const scratchCtx = scratch.getContext("2d");
    if (!scratchCtx) return;
    scratchCtx.putImageData(overlay, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(scratch, 0, 0, REMORPH_STAGE_SIZE, REMORPH_STAGE_SIZE);
  }, []);

  const updateHover = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const workPixels = workPixelsRef.current;
      if (!canvas || !workPixels || disabled) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.min(
        REMORPH_WORK_SIZE - 1,
        Math.max(
          0,
          Math.floor(
            ((clientX - rect.left) / rect.width) * REMORPH_WORK_SIZE,
          ),
        ),
      );
      const y = Math.min(
        REMORPH_WORK_SIZE - 1,
        Math.max(
          0,
          Math.floor(
            ((clientY - rect.top) / rect.height) * REMORPH_WORK_SIZE,
          ),
        ),
      );
      pointerRef.current = { x, y };
      const index = y * REMORPH_WORK_SIZE + x;
      hoverRef.current = selectSimilar(
        workPixels,
        index,
        toleranceRef.current,
      );
      renderOverlay();
    },
    [disabled, renderOverlay],
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

  const clear = useCallback(() => {
    committedRef.current = new Uint8Array(
      REMORPH_STAGE_SIZE * REMORPH_STAGE_SIZE,
    );
    hoverRef.current = null;
    pointerRef.current = null;
    renderOverlay();
    onSelectionChange?.(false);
  }, [onSelectionChange, renderOverlay]);

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
    let cancelled = false;

    async function loadPixels() {
      committedRef.current = new Uint8Array(
        REMORPH_STAGE_SIZE * REMORPH_STAGE_SIZE,
      );
      hoverRef.current = null;
      pointerRef.current = null;

      const [workPixels, fullPixels] = await Promise.all([
        getStagePixels(image, REMORPH_WORK_SIZE),
        getStagePixels(image, REMORPH_STAGE_SIZE),
      ]);

      if (cancelled) return;
      workPixelsRef.current = workPixels;
      fullPixelsRef.current = fullPixels;
      renderOverlay();
      onSelectionChange?.(false);
    }

    void loadPixels();

    return () => {
      cancelled = true;
    };
  }, [image, onSelectionChange, renderOverlay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = REMORPH_STAGE_SIZE;
    canvas.height = REMORPH_STAGE_SIZE;
  }, []);

  useEffect(() => {
    if (pointerRef.current) {
      const { x, y } = pointerRef.current;
      const index = y * REMORPH_WORK_SIZE + x;
      if (workPixelsRef.current) {
        hoverRef.current = selectSimilar(
          workPixelsRef.current,
          index,
          tolerance,
        );
        renderOverlay();
      }
    }
  }, [tolerance, renderOverlay]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const fullPixels = fullPixelsRef.current;
      if (!canvas || !fullPixels || disabled) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.min(
        REMORPH_STAGE_SIZE - 1,
        Math.max(
          0,
          Math.floor(
            ((clientX - rect.left) / rect.width) * REMORPH_STAGE_SIZE,
          ),
        ),
      );
      const y = Math.min(
        REMORPH_STAGE_SIZE - 1,
        Math.max(
          0,
          Math.floor(
            ((clientY - rect.top) / rect.height) * REMORPH_STAGE_SIZE,
          ),
        ),
      );
      const index = y * REMORPH_STAGE_SIZE + x;
      const patch = selectSimilar(fullPixels, index, toleranceRef.current);
      mergeSelection(committedRef.current, patch);
      renderOverlay();
      onSelectionChange?.(countSelected(committedRef.current));
    },
    [disabled, onSelectionChange, renderOverlay],
  );

  return (
    <canvas
      ref={canvasRef}
      className="remorph-stage__select"
      aria-label="Hover to highlight similar features, click to select"
      onPointerMove={(event) => {
        if (disabled) return;
        scheduleHoverUpdate(event.clientX, event.clientY);
      }}
      onPointerLeave={() => {
        hoverRef.current = null;
        pointerRef.current = null;
        renderOverlay();
      }}
      onClick={(event) => {
        if (disabled) return;
        handleClick(event.clientX, event.clientY);
      }}
    />
  );
});
