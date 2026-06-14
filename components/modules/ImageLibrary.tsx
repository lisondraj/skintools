"use client";

import { useEffect, useRef, useState } from "react";
import { hydrateAlbums, getAlbums } from "@/lib/remorph/storage";
import { readFileAsDataUrl } from "@/lib/remorph/image-utils";
import type { RemorphAlbum } from "@/lib/remorph/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectImage: (src: string) => void;
};

export function ImageLibrary({ open, onClose, onSelectImage }: Props) {
  const [albums, setAlbums] = useState<RemorphAlbum[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    void hydrateAlbums().then(() => setAlbums(getAlbums()));
  }, [open]);

  if (!open) return null;

  async function handleUpload(file: File) {
    const src = await readFileAsDataUrl(file);
    onSelectImage(src);
    onClose();
  }

  return (
    <div className="modules-modal" role="dialog" aria-modal="true" aria-label="Image library">
      <div className="modules-modal__backdrop" onClick={onClose} />
      <div className="modules-modal__panel">
        <header className="modules-modal__header">
          <h2>Add image</h2>
          <button type="button" className="modules-btn modules-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="modules-modal__section">
          <button
            type="button"
            className="modules-btn"
            onClick={() => fileRef.current?.click()}
          >
            Upload image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="modules-modal__section">
          <h3 className="modules-modal__subtitle">From Remorph history</h3>
          {albums.length === 0 ? (
            <p className="modules-modal__empty">
              No Remorph images yet. Generate or upload in Remorph first.
            </p>
          ) : (
            <div className="modules-library-grid">
              {albums.map((album) => {
                const step = album.steps[album.steps.length - 1];
                if (!step) return null;
                return (
                  <button
                    key={album.id}
                    type="button"
                    className="modules-library-item"
                    onClick={() => {
                      onSelectImage(step.image);
                      onClose();
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={step.image} alt={album.title} />
                    <span>{album.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
