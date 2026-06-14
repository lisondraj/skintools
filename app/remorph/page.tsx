"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HistoryPanel } from "@/components/remorph/HistoryPanel";
import { ImageStage } from "@/components/remorph/ImageStage";
import { PromptBar } from "@/components/remorph/PromptBar";
import type { MaskCanvasHandle } from "@/components/remorph/MaskCanvas";
import { editImage, generateImage } from "@/lib/remorph/client";
import { normalizeToStage, readFileAsDataUrl } from "@/lib/remorph/image-utils";
import {
  appendAlbumStep,
  createAlbum,
  getAlbums,
  truncateTitle,
  updateAlbumTitle,
} from "@/lib/remorph/storage";
import { fetchImageTitle } from "@/lib/remorph/title-client";
import type { RemorphAlbum, RemorphAlbumStep } from "@/lib/remorph/types";

function makeStep(
  image: string,
  kind: RemorphAlbumStep["kind"],
  prompt?: string,
): RemorphAlbumStep {
  return {
    id: crypto.randomUUID(),
    image,
    kind,
    prompt,
    createdAt: Date.now(),
  };
}

export default function RemorphPage() {
  const [image, setImage] = useState<string | null>(null);
  const [previousImage, setPreviousImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(36);
  const [brushMode, setBrushMode] = useState<"paint" | "erase">("paint");
  const [albums, setAlbums] = useState<RemorphAlbum[]>([]);

  const maskRef = useRef<MaskCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeAlbumIdRef = useRef<string | null>(null);

  const refreshAlbums = useCallback(() => {
    setAlbums(getAlbums());
  }, []);

  useEffect(() => {
    refreshAlbums();
  }, [refreshAlbums]);

  const clearMask = useCallback(() => {
    maskRef.current?.clear();
  }, []);

  const startAlbum = useCallback(
    (step: RemorphAlbumStep, fallbackTitle: string) => {
      const album = createAlbum(step, truncateTitle(fallbackTitle));
      activeAlbumIdRef.current = album.id;
      refreshAlbums();

      void fetchImageTitle(step.image)
        .then((title) => {
          updateAlbumTitle(album.id, title);
          refreshAlbums();
        })
        .catch(() => {
          /* keep fallback title */
        });
    },
    [refreshAlbums],
  );

  const addEditToAlbum = useCallback(
    (step: RemorphAlbumStep) => {
      const albumId = activeAlbumIdRef.current;
      if (!albumId) return;
      appendAlbumStep(albumId, step);
      refreshAlbums();
    },
    [refreshAlbums],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const normalized = await normalizeToStage(dataUrl);
        setPreviousImage(null);
        setImage(normalized);
        clearMask();
        activeAlbumIdRef.current = null;
        startAlbum(makeStep(normalized, "upload"), "Uploaded skin photo");
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Upload failed.",
        );
      } finally {
        setBusy(false);
      }
    },
    [clearMask, startAlbum],
  );

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setError(null);
    setBusy(true);
    try {
      const generated = await generateImage(trimmed);
      const normalized = await normalizeToStage(generated);
      setPreviousImage(null);
      setImage(normalized);
      clearMask();
      activeAlbumIdRef.current = null;
      startAlbum(makeStep(normalized, "generate", trimmed), trimmed);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Generation failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [clearMask, prompt, startAlbum]);

  const handleEdit = useCallback(async () => {
    if (!image) return;
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setError(null);
    setBusy(true);
    try {
      const { mask } = maskRef.current?.exportMask() ?? { mask: null };
      const edited = await editImage({
        image,
        mask: mask ?? undefined,
        prompt: trimmed,
      });
      const normalized = await normalizeToStage(edited);
      setPreviousImage(image);
      setImage(normalized);
      clearMask();
      addEditToAlbum(makeStep(normalized, "edit", trimmed));
    } catch (editError) {
      setError(
        editError instanceof Error ? editError.message : "Edit failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [addEditToAlbum, clearMask, image, prompt]);

  const handleUndo = useCallback(() => {
    if (!previousImage) return;
    setImage(previousImage);
    setPreviousImage(null);
    clearMask();
    setError(null);
  }, [clearMask, previousImage]);

  const handleSelectHistoryImage = useCallback(
    (selected: string, albumId: string) => {
      setImage(selected);
      setPreviousImage(null);
      activeAlbumIdRef.current = albumId;
      clearMask();
      setError(null);
    },
    [clearMask],
  );

  const handleSubmit = image ? handleEdit : handleGenerate;

  return (
    <div className="remorph__shell">
      <header className="remorph__header">
        <h1 className="remorph__logo">Remorph</h1>
        <p className="remorph__tagline">
          Paint a region, prompt an edit — everything else stays the same.
        </p>
      </header>

      <div className="remorph__workspace">
        <div className="remorph__stage-wrap">
          {image ? (
            <ImageStage
              ref={maskRef}
              image={image}
              brushSize={brushSize}
              brushMode={brushMode}
              disabled={busy}
            />
          ) : (
            <div className="remorph__stage-empty">
              <p>Upload a close-up skin photo or generate one with AI.</p>
              {busy && (
                <div className="remorph__loading">
                  <span className="remorph__spinner" aria-hidden />
                  Working...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="remorph__panel">
          {error && <div className="remorph__error">{error}</div>}

          {busy && image && (
            <div className="remorph__loading">
              <span className="remorph__spinner" aria-hidden />
              Working...
            </div>
          )}

          <section className="remorph__section">
            <h2 className="remorph__section-title">Source</h2>
            <div className="remorph__btn-row">
              <button
                type="button"
                className="remorph__btn remorph__btn--secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                Upload photo
              </button>
              {previousImage && (
                <button
                  type="button"
                  className="remorph__btn remorph__btn--secondary"
                  onClick={handleUndo}
                  disabled={busy}
                >
                  Undo
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              className="remorph__file-input"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.target.value = "";
              }}
            />
          </section>

          <PromptBar
            mode={image ? "edit" : "generate"}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={() => void handleSubmit()}
            busy={busy}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            brushMode={brushMode}
            onBrushModeChange={setBrushMode}
            onClearMask={clearMask}
            hasImage={Boolean(image)}
          />
        </div>
      </div>

      <HistoryPanel
        albums={albums}
        onAlbumsChange={refreshAlbums}
        onSelectImage={handleSelectHistoryImage}
      />
    </div>
  );
}
