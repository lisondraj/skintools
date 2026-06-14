"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageStage } from "@/components/remorph/ImageStage";
import { PromptBar } from "@/components/remorph/PromptBar";
import type { FeatureSelectHandle } from "@/components/remorph/FeatureSelectCanvas";
import { editImage, generateImage, segmentImage } from "@/lib/remorph/client";
import { normalizeToStage, readFileAsDataUrl } from "@/lib/remorph/image-utils";
import type { RemorphFeature } from "@/lib/remorph/types";

export default function RemorphPage() {
  const [image, setImage] = useState<string | null>(null);
  const [previousImage, setPreviousImage] = useState<string | null>(null);
  const [features, setFeatures] = useState<RemorphFeature[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [segmenting, setSegmenting] = useState(false);
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [masksReady, setMasksReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  const selectRef = useRef<FeatureSelectHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<string | null>(null);

  const clearSelection = useCallback(() => {
    selectRef.current?.clear();
    setHasSelection(false);
    setHoverLabel(null);
  }, []);

  const runSegmentation = useCallback(
    async (source: string) => {
      imageRef.current = source;
      setSegmenting(true);
      setSegmentError(null);
      setFeatures([]);
      setMasksReady(false);
      clearSelection();

      try {
        const result = await segmentImage(source);
        if (imageRef.current !== source) return;
        setFeatures(result.features);
      } catch (segmentErr) {
        if (imageRef.current !== source) return;
        setSegmentError(
          segmentErr instanceof Error
            ? segmentErr.message
            : "Feature analysis failed.",
        );
      } finally {
        if (imageRef.current === source) {
          setSegmenting(false);
        }
      }
    },
    [clearSelection],
  );

  useEffect(() => {
    if (!image) {
      imageRef.current = null;
      setFeatures([]);
      setSegmentError(null);
      setSegmenting(false);
      setMasksReady(false);
      return;
    }
    void runSegmentation(image);
  }, [image, runSegmentation]);

  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const normalized = await normalizeToStage(dataUrl);
      setPreviousImage(null);
      setImage(normalized);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

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
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Generation failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [prompt]);

  const handleEdit = useCallback(async () => {
    if (!image || segmentError || segmenting || !masksReady) return;
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
    } catch (editError) {
      setError(
        editError instanceof Error ? editError.message : "Edit failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [image, masksReady, prompt, segmentError, segmenting]);

  const handleUndo = useCallback(() => {
    if (!previousImage) return;
    setImage(previousImage);
    setPreviousImage(null);
    setError(null);
  }, [previousImage]);

  const handleSubmit = image ? handleEdit : handleGenerate;
  const segmentReady = Boolean(
    image && !segmenting && !segmentError && masksReady,
  );

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
            <>
              <ImageStage
                ref={selectRef}
                image={image}
                features={features}
                disabled={busy || segmenting || Boolean(segmentError)}
                onSelectionChange={setHasSelection}
                onHoverCategoryChange={(_category, label) =>
                  setHoverLabel(label)
                }
                onMasksReady={setMasksReady}
              />
              {segmenting && (
                <div className="remorph-stage__overlay">
                  <div className="remorph__loading">
                    <span className="remorph__spinner" aria-hidden />
                    Analyzing features…
                  </div>
                </div>
              )}
              {!segmenting && !segmentError && !masksReady && (
                <div className="remorph-stage__overlay">
                  <div className="remorph__loading">
                    <span className="remorph__spinner" aria-hidden />
                    Preparing selection…
                  </div>
                </div>
              )}
              {segmentError && !segmenting && (
                <div className="remorph-stage__overlay">
                  <div className="remorph-stage__overlay-panel">
                    <p className="remorph__error">{segmentError}</p>
                    <button
                      type="button"
                      className="remorph__btn remorph__btn--secondary"
                      onClick={() => void runSegmentation(image)}
                    >
                      Retry analysis
                    </button>
                  </div>
                </div>
              )}
            </>
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
            onClearSelection={clearSelection}
            hasImage={Boolean(image)}
            hasSelection={hasSelection}
            hoverLabel={hoverLabel}
            segmentReady={segmentReady}
          />
        </div>
      </div>
    </div>
  );
}
