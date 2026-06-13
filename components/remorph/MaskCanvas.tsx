"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { REMORPH_STAGE_SIZE } from "@/lib/remorph/types";
import { buildEditMaskFromBrush } from "@/lib/remorph/image-utils";

export type BrushMode = "paint" | "erase";

export type MaskCanvasHandle = {
  clear: () => void;
  exportMask: () => { mask: string | null; hasPaint: boolean };
};

type MaskCanvasProps = {
  brushSize: number;
  brushMode: BrushMode;
  disabled?: boolean;
};

export const MaskCanvas = forwardRef<MaskCanvasHandle, MaskCanvasProps>(
  function MaskCanvas({ brushSize, brushMode, disabled = false }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    useImperativeHandle(ref, () => ({
      clear,
      exportMask: () => {
        const canvas = canvasRef.current;
        if (!canvas) return { mask: null, hasPaint: false };
        const { mask, hasPaint } = buildEditMaskFromBrush(canvas);
        return { mask: hasPaint ? mask : null, hasPaint };
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = REMORPH_STAGE_SIZE;
      canvas.height = REMORPH_STAGE_SIZE;
    }, []);

    const drawAt = useCallback(
      (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas || disabled) return;
        const rect = canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * REMORPH_STAGE_SIZE;
        const y = ((clientY - rect.top) / rect.height) * REMORPH_STAGE_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = brushSize;

        if (brushMode === "erase") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = "rgba(255, 60, 60, 0.45)";
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      },
      [brushMode, brushSize, disabled],
    );

    const startStroke = useCallback(
      (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas || disabled) return;
        drawingRef.current = true;
        const rect = canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * REMORPH_STAGE_SIZE;
        const y = ((clientY - rect.top) / rect.height) * REMORPH_STAGE_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(x, y);
        drawAt(clientX, clientY);
      },
      [disabled, drawAt],
    );

    const endStroke = useCallback(() => {
      drawingRef.current = false;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      ctx?.beginPath();
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className="remorph-stage__mask"
        aria-label="Paint the region to edit"
        onPointerDown={(event) => {
          if (disabled) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          startStroke(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current) return;
          drawAt(event.clientX, event.clientY);
        }}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
    );
  },
);
