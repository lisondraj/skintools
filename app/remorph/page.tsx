"use client";

import { useCallback, useRef, useState } from "react";
import { ImageStage } from "@/components/remorph/ImageStage";
import { PromptBar } from "@/components/remorph/PromptBar";
import type { FeatureSelectHandle } from "@/components/remorph/FeatureSelectCanvas";
import { editImage, generateImage } from "@/lib/remorph/client";
import { normalizeToStage, readFileAsDataUrl } from "@/lib/remorph/image-utils";

export default function RemorphPage() {
  const [image, setImage] = useState<string | null>(null);
  const [previousImage, setPreviousImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState(50);
  const [hasSelection, setHasSelection] = useState(false);

  const selectRef = useRef<FeatureSelectHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearSelection = useCallback(() => {
    selectRef.current?.clear();
    setHasSelection(false);
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const normalized = await normalizeToStage(dataUrl);
        setPreviousImage(null);
        setImage(normalized);
        clearSelection();
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
    [clearSelection],
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
      clearSelection();
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Generation failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [clearSelection, prompt]);

  const handleEdit = useCallback(async () => {
    if (!image) return;
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setError(null);
    setBusy(true);
    try {
      const { mask } = selectRef.current?.exportMask() ?? { mask: null };
      const edited = await editImage({
        image,
        mask: mask ?? undefined,
        prompt: trimmed,
      });
      const normalized = await normalizeToStage(edited);
      setPreviousImage(image);
      setImage(normalized);
      clearSelection();
    } catch (editError) {
      setError(
        editError instanceof Error ? editError.message : "Edit failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [clearSelection, image, prompt]);

  const handleUndo = useCallback(() => {
    if (!previousImage) return;
    setImage(previousImage);
    setPreviousImage(null);
    clearSelection();
    setError(null);
  }, [clearSelection, previousImage]);

  const handleSubmit = image ? handleEdit : handleGenerate;

  return (
    <div className="remorph__shell">
      <header className="remorph__header">
        <h1 className="remorph__logo">Remorph</h1>
        <p className="remorph__tagline">
          Select a feature, prompt an edit — everything else stays the same.
        </p>
      </header>

      <div className="remorph__workspace">
        <div className="remorph__stage-wrap">
          {image ? (
            <ImageStage
              ref={selectRef}
              image={image}
              tolerance={tolerance}
              disabled={busy}
              onSelectionChange={setHasSelection}
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
            tolerance={tolerance}
            onToleranceChange={setTolerance}
            onClearSelection={clearSelection}
            hasImage={Boolean(image)}
            hasSelection={hasSelection}
          />
        </div>
      </div>
    </div>
  );
}
