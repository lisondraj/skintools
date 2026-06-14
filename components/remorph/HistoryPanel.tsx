"use client";

import type { CSSProperties } from "react";
import {
  deleteAlbum,
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
  return (
    <article
      className="remorph-album"
      style={{ "--album-step-count": album.steps.length } as CSSProperties}
    >
      <div className="remorph-album__stack">
        {album.steps.length > 1 && (
          <button
            type="button"
            className="remorph-album__delete"
            aria-label="Delete bundle"
            onClick={() => {
              deleteAlbum(album.id);
              onAlbumsChange();
              onDeleteAlbum(album.id);
            }}
          >
            ×
          </button>
        )}

        {album.steps.map((step, index) => (
          <AlbumStackLayer
            key={step.id}
            album={album}
            step={step}
            index={index}
            total={album.steps.length}
            onSelectImage={onSelectImage}
            onDeleteStep={onDeleteStep}
            onAlbumsChange={onAlbumsChange}
            onDeleteAlbum={onDeleteAlbum}
          />
        ))}
      </div>
    </article>
  );
}

function AlbumStackLayer({
  album,
  step,
  index,
  total,
  onSelectImage,
  onDeleteStep,
  onAlbumsChange,
  onDeleteAlbum,
}: {
  album: RemorphAlbum;
  step: RemorphAlbumStep;
  index: number;
  total: number;
  onSelectImage: (image: string, albumId: string) => void;
  onDeleteStep: (albumId: string, stepId: string) => void;
  onAlbumsChange: () => void;
  onDeleteAlbum: (albumId: string) => void;
}) {
  const isLatest = index === total - 1;
  const stackDepth = total - 1 - index;
  const label = stepLabel(index);
  const dragPayload: RemorphDragStep = {
    image: step.image,
    albumId: album.id,
    stepId: step.id,
    label,
  };

  return (
    <div
      className="remorph-album__layer"
      style={
        {
          "--stack-depth": stackDepth,
          zIndex: index + 1,
        } as CSSProperties
      }
    >
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
        title={
          step.prompt ? `${step.kind}: ${step.prompt}` : `${step.kind}`
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step.image} alt={label} />
        {isLatest && (
          <span className="remorph-album__overlay">
            <span className="remorph-album__overlay-title">
              {truncateTitle(album.title, 42)}
            </span>
            <span className="remorph-album__overlay-date">
              {formatAlbumTime(album.updatedAt)}
            </span>
          </span>
        )}
      </button>

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
