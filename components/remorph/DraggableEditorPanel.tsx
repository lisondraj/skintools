"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

type DraggableEditorPanelProps = {
  children: ReactNode;
};

export function DraggableEditorPanel({ children }: DraggableEditorPanelProps) {
  const [position, setPosition] = useState({ x: 24, y: 96 });
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: position.x,
        originY: position.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [position.x, position.y],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      setPosition({
        x: Math.max(8, drag.originX + (event.clientX - drag.startX)),
        y: Math.max(8, drag.originY + (event.clientY - drag.startY)),
      });
    },
    [],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragState.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [],
  );

  return (
    <div
      className="remorph-float"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="remorph-float__header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="remorph-float__title">Editor</span>
      </div>
      <div className="remorph-float__body">{children}</div>
    </div>
  );
}
