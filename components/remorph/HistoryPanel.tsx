"use client";

import {
  deleteAlbum,
  formatAlbumTime,
} from "@/lib/remorph/storage";
import type { RemorphAlbum } from "@/lib/remorph/types";

type HistoryPanelProps = {
  albums: RemorphAlbum[];
  onAlbumsChange: () => void;
  onSelectImage: (image: string, albumId: string) => void;
};

export function HistoryPanel({
  albums,
  onAlbumsChange,
  onSelectImage,
}: HistoryPanelProps) {
  if (albums.length === 0) {
    return (
      <section className="remorph-history">
        <h2 className="remorph-history__heading">History</h2>
        <p className="remorph-history__empty">
          Generated and edited images appear here, grouped by session.
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
                }}
              >
                Delete
              </button>
            </div>

            <div className="remorph-album__strip">
              {album.steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className="remorph-album__thumb"
                  onClick={() => onSelectImage(step.image, album.id)}
                  title={
                    step.prompt
                      ? `${step.kind}: ${step.prompt}`
                      : step.kind
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.image} alt={`Version ${index + 1}`} />
                  <span className="remorph-album__thumb-label">
                    {index === 0 ? "Original" : `Edit ${index}`}
                  </span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
