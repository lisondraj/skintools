"use client";

import type { CSSProperties } from "react";
import {
  deleteAlbumStep,
  formatAlbumTime,
  truncateTitle,
} from "@/lib/remorph/storage";
import {
  REMORPH_DRAG_MIME,
  type RemorphAlbum,
  type RemorphAlbumStep,
  type RemorphDragStep,
} from "@/lib/remorph/types";

type HistoryPanelProps = {
  albums: RemorphAlbum[];
  onAlbumsChange: () => void;
  onSelectImage: (image: string, albumId: string) => void;
  onDeleteStep: (albumId: string, stepId: string) => void;
  onDeleteAlbum: (albumId: string) => void;
};

function stepLabel(index: number): string {
  return index === 0 ? "Original" : `Edit ${index}`;
}

const MAX_VISIBLE = 3;

function AlbumStack({
  album,
  onAlbumsChange,
  onSelectImage,
  onDeleteStep,
  onDeleteAlbum,
}: {
  album: RemorphAlbum;
  onAlbumsChange: () => void;
  onSelectImage: (image: string, albumId: string) => void;
  onDeleteStep: (albumId: string, stepId: string) => void;
  onDeleteAlbum: (albumId: string) => void;
}) {
  // Show at most MAX_VISIBLE steps; always include the latest (last in array)
  const visibleSteps = album.steps.slice(-MAX_VISIBLE);
  const visibleCount = visibleSteps.length;

  return (
    <article
      className="remorph-album"
      style={{ "--album-visible-count": visibleCount } as CSSProperties}
    >
      <div className="remorph-album__stack">
        {/* Render oldest first so latest (highest z-index) paints on top */}
        {visibleSteps.map((step, visIdx) => {
          const globalIndex = album.steps.indexOf(step);
          const isLatest = visIdx === visibleCount - 1;
          // stackDepth 0 = latest (front/leftmost), increases toward back
          const stackDepth = visibleCount - 1 - visIdx;
          return (
            <AlbumStackLayer
              key={step.id}
              album={album}
              step={step}
              globalIndex={globalIndex}
              stackDepth={stackDepth}
              isLatest={isLatest}
              onSelectImage={onSelectImage}
              onDeleteStep={onDeleteStep}
              onAlbumsChange={onAlbumsChange}
              onDeleteAlbum={onDeleteAlbum}
            />
          );
        })}
      </div>
    </article>
  );
}

function AlbumStackLayer({
  album,
  step,
  globalIndex,
  stackDepth,
  isLatest,
  onSelectImage,
  onDeleteStep,
  onAlbumsChange,
  onDeleteAlbum,
}: {
  album: RemorphAlbum;
  step: RemorphAlbumStep;
  globalIndex: number;
  stackDepth: number;
  isLatest: boolean;
  onSelectImage: (image: string, albumId: string) => void;
  onDeleteStep: (albumId: string, stepId: string) => void;
  onAlbumsChange: () => void;
  onDeleteAlbum: (albumId: string) => void;
}) {
  const label = stepLabel(globalIndex);
  const dragPayload: RemorphDragStep = {
    image: step.image,
    albumId: album.id,
    stepId: step.id,
    label,
  };

  return (
    <div
      className={`remorph-album__layer ${isLatest ? "is-latest" : "is-background"}`}
      style={
        {
          "--stack-depth": stackDepth,
          zIndex: MAX_VISIBLE - stackDepth,
        } as CSSProperties
      }
    >
      {isLatest ? (
        <button
          type="button"
          className="remorph-album__thumb"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(
              REMORPH_DRAG_MIME,
              JSON.stringify(dragPayload),
            );
            event.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => onSelectImage(step.image, album.id)}
          title={step.prompt ? `${step.kind}: ${step.prompt}` : step.kind}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.image} alt={label} />
          <span className="remorph-album__overlay">
            <span className="remorph-album__overlay-title">
              {truncateTitle(album.title, 28)}
            </span>
            <span className="remorph-album__overlay-date">
              {formatAlbumTime(album.updatedAt)}
            </span>
          </span>
        </button>
      ) : (
        <div className="remorph-album__thumb remorph-album__thumb--bg" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.image} alt="" />
        </div>
      )}

      {isLatest && (
        <button
          type="button"
          className="remorph-album__thumb-delete"
          aria-label={`Delete ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            const result = deleteAlbumStep(album.id, step.id);
            if (!result) return;
            onAlbumsChange();
            onDeleteStep(album.id, step.id);
            if (result.albumRemoved) {
              onDeleteAlbum(album.id);
            }
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function HistoryPanel({
  albums,
  onAlbumsChange,
  onSelectImage,
  onDeleteStep,
  onDeleteAlbum,
}: HistoryPanelProps) {
  if (albums.length === 0) {
    return (
      <section className="remorph-history">
        <h2 className="remorph-history__heading">History</h2>
        <p className="remorph-history__empty">
          Generated and edited images appear here, grouped by session. Drag a
          thumbnail onto the preview to compare side by side.
        </p>
      </section>
    );
  }

  return (
    <section className="remorph-history">
      <h2 className="remorph-history__heading">History</h2>
      <div className="remorph-history__list">
        {albums.map((album) => (
          <AlbumStack
            key={album.id}
            album={album}
            onAlbumsChange={onAlbumsChange}
            onSelectImage={onSelectImage}
            onDeleteStep={onDeleteStep}
            onDeleteAlbum={onDeleteAlbum}
          />
        ))}
      </div>
    </section>
  );
}
