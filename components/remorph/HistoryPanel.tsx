"use client";

import {
  deleteAlbum,
  deleteAlbumStep,
  formatAlbumTime,
} from "@/lib/remorph/storage";
import {
  REMORPH_DRAG_MIME,
  type RemorphAlbum,
  type RemorphDragStep,
} from "@/lib/remorph/types";

type HistoryPanelProps = {
  albums: RemorphAlbum[];
  onAlbumsChange: () => void;
  onSelectImage: (image: string, albumId: string) => void;
  onDeleteStep: (albumId: string, stepId: string) => void;
  onDeleteAlbum: (albumId: string) => void;
};

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
          <article key={album.id} className="remorph-album">
            <div className="remorph-album__header">
              <div>
                <h3 className="remorph-album__title">{album.title}</h3>
                <p className="remorph-album__time">
                  {formatAlbumTime(album.createdAt)}
                  {album.steps.length > 1
                    ? ` · ${album.steps.length} versions`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className="remorph-album__delete"
                onClick={() => {
                  deleteAlbum(album.id);
                  onAlbumsChange();
                  onDeleteAlbum(album.id);
                }}
              >
                Delete bundle
              </button>
            </div>

            <div className="remorph-album__strip">
              {album.steps.map((step, index) => {
                const label = index === 0 ? "Original" : `Edit ${index}`;
                const dragPayload: RemorphDragStep = {
                  image: step.image,
                  albumId: album.id,
                  stepId: step.id,
                  label,
                };

                return (
                  <div key={step.id} className="remorph-album__thumb-wrap">
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
                        step.prompt
                          ? `${step.kind}: ${step.prompt}`
                          : `${step.kind} — drag to preview for split screen`
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={step.image} alt={`Version ${index + 1}`} />
                      <span className="remorph-album__thumb-label">{label}</span>
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
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
