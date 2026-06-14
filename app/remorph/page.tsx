"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { DraggableEditorPanel } from "@/components/remorph/DraggableEditorPanel";
import { EntryBoxes } from "@/components/remorph/EntryBoxes";
import { HistoryPanel } from "@/components/remorph/HistoryPanel";
import { LoadingState } from "@/components/remorph/LoadingState";
import { PromptBar } from "@/components/remorph/PromptBar";
import { SplitStage } from "@/components/remorph/SplitStage";
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
import {
  REMORPH_DRAG_MIME,
  type RemorphAlbum,
  type RemorphAlbumStep,
  type RemorphComparePane,
  type RemorphDragStep,
} from "@/lib/remorph/types";

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

function findStepForImage(
  albums: RemorphAlbum[],
  albumId: string,
  imageSrc: string,
): RemorphAlbumStep | null {
  const album = albums.find((entry) => entry.id === albumId);
  if (!album) return null;
  return (
    album.steps.find((step) => step.image === imageSrc) ??
    album.steps[album.steps.length - 1] ??
    null
  );
}

function paneFromImage(
  albums: RemorphAlbum[],
  imageSrc: string,
  albumId: string,
): RemorphComparePane {
  const step = findStepForImage(albums, albumId, imageSrc);
  const index = step
    ? albums
        .find((entry) => entry.id === albumId)
        ?.steps.findIndex((entry) => entry.id === step.id) ?? 0
    : 0;

  return {
    image: imageSrc,
    albumId,
    stepId: step?.id ?? "",
    label: index <= 0 ? "Original" : `Edit ${index}`,
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
  const [splitMode, setSplitMode] = useState(false);
  const [compareLeft, setCompareLeft] = useState<RemorphComparePane | null>(
    null,
  );
  const [compareRight, setCompareRight] = useState<RemorphComparePane | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<"left" | "right">("left");
  const [dropHover, setDropHover] = useState(false);
  const [splitDropHint, setSplitDropHint] = useState(false);
  const [promptEntryOpen, setPromptEntryOpen] = useState(false);
  const [splitPaneSize, setSplitPaneSize] = useState<number | null>(null);

  const maskRef = useRef<MaskCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
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

  const exitSplitMode = useCallback(() => {
    const activePane =
      editTarget === "left" ? compareLeft : compareRight ?? compareLeft;

    setSplitMode(false);
    setCompareLeft(null);
    setCompareRight(null);
    setSplitPaneSize(null);
    setDropHover(false);
    clearMask();

    if (activePane) {
      setImage(activePane.image);
      activeAlbumIdRef.current = activePane.albumId || null;
    }
  }, [clearMask, compareLeft, compareRight, editTarget]);

  const enterSplitMode = useCallback(
    (left: RemorphComparePane, right: RemorphComparePane) => {
      const rect = stageWrapRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        setSplitPaneSize(Math.round(rect.width));
      }

      setSplitMode(true);
      setCompareLeft(left);
      setCompareRight(right);
      setEditTarget("left");
      setDropHover(false);
      clearMask();
      activeAlbumIdRef.current = left.albumId || null;
      setSplitDropHint(false);
    },
    [clearMask],
  );

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
        if (splitMode) exitSplitMode();
        clearMask();
        activeAlbumIdRef.current = null;
        setSplitDropHint(false);
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
    [clearMask, exitSplitMode, splitMode, startAlbum],
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
      if (splitMode) exitSplitMode();
      clearMask();
      activeAlbumIdRef.current = null;
      setSplitDropHint(false);
      startAlbum(makeStep(normalized, "generate", trimmed), trimmed);
      setPromptEntryOpen(false);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Generation failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [clearMask, exitSplitMode, prompt, splitMode, startAlbum]);

  const handleEdit = useCallback(async () => {
    const sourceImage = splitMode
      ? editTarget === "left"
        ? compareLeft?.image
        : compareRight?.image
      : image;

    if (!sourceImage) return;
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const targetPane = splitMode
      ? editTarget === "left"
        ? compareLeft
        : compareRight
      : null;

    if (targetPane?.albumId) {
      activeAlbumIdRef.current = targetPane.albumId;
    }

    setError(null);
    setBusy(true);
    try {
      const { mask } = maskRef.current?.exportMask() ?? { mask: null };
      const edited = await editImage({
        image: sourceImage,
        mask: mask ?? undefined,
        prompt: trimmed,
      });
      const normalized = await normalizeToStage(edited);
      const step = makeStep(normalized, "edit", trimmed);

      if (splitMode && targetPane) {
        setPreviousImage(sourceImage);
        setImage(normalized);
      } else {
        setPreviousImage(sourceImage);
        setImage(normalized);
      }

      clearMask();
      addEditToAlbum(step);

      if (splitMode && targetPane?.albumId) {
        const updatedAlbum = getAlbums().find(
          (entry) => entry.id === targetPane.albumId,
        );
        const stepIndex =
          updatedAlbum?.steps.findIndex((entry) => entry.id === step.id) ?? -1;
        const label = stepIndex <= 0 ? "Original" : `Edit ${stepIndex}`;

        const labeledPane: RemorphComparePane = {
          ...targetPane,
          image: normalized,
          stepId: step.id,
          label,
        };

        if (editTarget === "left") {
          setCompareLeft(labeledPane);
        } else {
          setCompareRight(labeledPane);
        }
      }
    } catch (editError) {
      setError(
        editError instanceof Error ? editError.message : "Edit failed.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    addEditToAlbum,
    clearMask,
    compareLeft,
    compareRight,
    editTarget,
    image,
    prompt,
    splitMode,
  ]);

  const handleUndo = useCallback(() => {
    if (!previousImage) return;
    setImage(previousImage);

    if (splitMode) {
      if (editTarget === "left" && compareLeft) {
        setCompareLeft({ ...compareLeft, image: previousImage });
      } else if (editTarget === "right" && compareRight) {
        setCompareRight({ ...compareRight, image: previousImage });
      }
    }

    setPreviousImage(null);
    clearMask();
    setError(null);
  }, [clearMask, compareLeft, compareRight, editTarget, previousImage, splitMode]);

  const handleSelectHistoryImage = useCallback(
    (selected: string, albumId: string) => {
      if (splitMode) exitSplitMode();
      setImage(selected);
      setPreviousImage(null);
      activeAlbumIdRef.current = albumId;
      clearMask();
      setError(null);
      setSplitDropHint(false);
    },
    [clearMask, exitSplitMode, splitMode],
  );

  const handleHistoryEntryDrop = useCallback(
    (payload: RemorphDragStep) => {
      handleSelectHistoryImage(payload.image, payload.albumId);
    },
    [handleSelectHistoryImage],
  );

  const handleSelectEditTarget = useCallback(
    (target: "left" | "right") => {
      setEditTarget(target);
      clearMask();
      const pane = target === "left" ? compareLeft : compareRight;
      if (pane) {
        setImage(pane.image);
        activeAlbumIdRef.current = pane.albumId || null;
      }
    },
    [clearMask, compareLeft, compareRight],
  );

  const handleStageDragOver = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(REMORPH_DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropHover(true);
  }, []);

  const handleStageDragLeave = useCallback((event: React.DragEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setDropHover(false);
  }, []);

  const handleStageDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDropHover(false);
      setSplitDropHint(false);

      const raw = event.dataTransfer.getData(REMORPH_DRAG_MIME);
      if (!raw) return;

      let payload: RemorphDragStep;
      try {
        payload = JSON.parse(raw) as RemorphDragStep;
      } catch {
        return;
      }

      if (!image) {
        handleSelectHistoryImage(payload.image, payload.albumId);
        return;
      }

      if (splitMode && compareLeft) {
        setCompareRight(payload);
        return;
      }

      const left = paneFromImage(
        albums,
        image,
        activeAlbumIdRef.current ?? "",
      );
      enterSplitMode(left, payload);
    },
    [albums, compareLeft, enterSplitMode, handleSelectHistoryImage, image, splitMode],
  );

  const handleDeleteStep = useCallback(
    (albumId: string, stepId: string) => {
      const album = albums.find((entry) => entry.id === albumId);
      const deletedStep = album?.steps.find((step) => step.id === stepId);

      if (splitMode) {
        const matchesLeft =
          compareLeft?.albumId === albumId && compareLeft.stepId === stepId;
        const matchesRight =
          compareRight?.albumId === albumId && compareRight.stepId === stepId;

        if (matchesLeft && matchesRight) {
          exitSplitMode();
          setImage(null);
          activeAlbumIdRef.current = null;
        } else if (matchesLeft && compareRight) {
          setCompareLeft(compareRight);
          setCompareRight(null);
          setEditTarget("left");
          setImage(compareRight.image);
          activeAlbumIdRef.current = compareRight.albumId || null;
        } else if (matchesRight && compareLeft) {
          setCompareRight(null);
          if (editTarget === "right") {
            setEditTarget("left");
            setImage(compareLeft.image);
            activeAlbumIdRef.current = compareLeft.albumId || null;
          }
        }
      }

      if (
        deletedStep &&
        image === deletedStep.image &&
        activeAlbumIdRef.current === albumId
      ) {
        const remaining = album?.steps.filter((step) => step.id !== stepId);
        const fallback = remaining?.[remaining.length - 1];
        if (fallback) {
          setImage(fallback.image);
          activeAlbumIdRef.current = albumId;
        } else {
          setImage(null);
          activeAlbumIdRef.current = null;
        }
        setPreviousImage(null);
        clearMask();
      }
    },
    [
      albums,
      clearMask,
      compareLeft,
      compareRight,
      editTarget,
      exitSplitMode,
      image,
      splitMode,
    ],
  );

  const handleDeleteAlbum = useCallback(
    (albumId: string) => {
      if (activeAlbumIdRef.current === albumId) {
        activeAlbumIdRef.current = null;
      }

      if (splitMode) {
        const leftMatches = compareLeft?.albumId === albumId;
        const rightMatches = compareRight?.albumId === albumId;

        if (leftMatches && rightMatches) {
          exitSplitMode();
          setImage(null);
        } else if (leftMatches && compareRight) {
          setCompareLeft(compareRight);
          setCompareRight(null);
          setEditTarget("left");
          setImage(compareRight.image);
          activeAlbumIdRef.current = compareRight.albumId || null;
        } else if (rightMatches) {
          setCompareRight(null);
          if (editTarget === "right" && compareLeft) {
            setEditTarget("left");
            setImage(compareLeft.image);
            activeAlbumIdRef.current = compareLeft.albumId || null;
          }
        }
      }

      if (activeAlbumIdRef.current === null && image) {
        const stillExists = getAlbums().some((album) =>
          album.steps.some((step) => step.image === image),
        );
        if (!stillExists) {
          setImage(null);
          setPreviousImage(null);
          clearMask();
        }
      }
    },
    [
      clearMask,
      compareLeft,
      compareRight,
      editTarget,
      exitSplitMode,
      image,
      splitMode,
    ],
  );

  const hasEditImage = splitMode
    ? Boolean(editTarget === "left" ? compareLeft?.image : compareRight?.image)
    : Boolean(image);

  const editorPanel = (
    <>
      {error && <div className="remorph__error">{error}</div>}

      {hasEditImage && (
        <>
          <section className="remorph__section remorph__section--sources">
            <EntryBoxes
              variant="panel"
              onUploadClick={() => fileInputRef.current?.click()}
              promptOpen={promptEntryOpen}
              onPromptOpen={() => setPromptEntryOpen(true)}
              prompt={prompt}
              onPromptChange={setPrompt}
              onPromptSubmit={() => void handleGenerate()}
              onHistoryDrop={handleHistoryEntryDrop}
              busy={busy}
              historyDropActive={splitDropHint || dropHover}
            />
          </section>

          <PromptBar
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={() => void handleEdit()}
            busy={busy}
          />

          {previousImage && (
            <button
              type="button"
              className="remorph__btn remorph__btn--secondary remorph__btn--compact remorph__undo-btn"
              onClick={handleUndo}
              disabled={busy}
            >
              Undo last edit
            </button>
          )}
        </>
      )}
    </>
  );

  return (
    <div className="remorph__shell">
      <header className="remorph__header">
        <h1 className="remorph__logo">Remorph</h1>
      </header>

      <div
        className={`remorph__workspace ${splitMode ? "remorph__workspace--split" : ""} ${!image && !splitMode ? "remorph__workspace--entry" : ""} ${image && !splitMode ? "remorph__workspace--editor" : ""}`}
      >
        {!image && !splitMode ? (
          <div
            className={`remorph-entry-area ${dropHover || splitDropHint ? "is-drop-target" : ""}`}
            onDragOver={handleStageDragOver}
            onDragLeave={handleStageDragLeave}
            onDrop={handleStageDrop}
          >
            {error && <div className="remorph__error">{error}</div>}

            <EntryBoxes
              onUploadClick={() => fileInputRef.current?.click()}
              promptOpen={promptEntryOpen}
              onPromptOpen={() => setPromptEntryOpen(true)}
              prompt={prompt}
              onPromptChange={setPrompt}
              onPromptSubmit={() => void handleGenerate()}
              onHistoryDrop={handleHistoryEntryDrop}
              busy={busy}
              historyDropActive={splitDropHint || dropHover}
            />

            {busy && (
              <div className="remorph__drop-overlay">
                <LoadingState variant="overlay" />
              </div>
            )}

            {(dropHover || splitDropHint) && !busy && (
              <div className="remorph__drop-overlay remorph__drop-overlay--hint" aria-hidden>
                {dropHover ? "Drop image" : "Drag from history below"}
              </div>
            )}
          </div>
        ) : (
          <div
            ref={stageWrapRef}
            className={`remorph__stage-wrap ${splitMode ? "remorph__stage-wrap--split" : ""} ${dropHover || splitDropHint ? "is-drop-target" : ""}`}
            style={
              splitMode && splitPaneSize
                ? ({ "--split-pane-size": `${splitPaneSize}px` } as CSSProperties)
                : undefined
            }
            onDragOver={handleStageDragOver}
            onDragLeave={handleStageDragLeave}
            onDrop={handleStageDrop}
          >
            {splitMode && compareLeft && compareRight ? (
              <SplitStage
                ref={maskRef}
                left={compareLeft}
                right={compareRight}
                editTarget={editTarget}
                onSelectTarget={handleSelectEditTarget}
                brushSize={brushSize}
                brushMode={brushMode}
                disabled={busy}
              />
            ) : (
              <ImageStage
                ref={maskRef}
                image={image!}
                brushSize={brushSize}
                brushMode={brushMode}
                disabled={busy}
              />
            )}

            {(dropHover || splitDropHint) && !busy && (
              <div className="remorph__drop-overlay remorph__drop-overlay--hint" aria-hidden>
                {dropHover ? "Split screen" : "Drag from history below"}
              </div>
            )}

            {busy && (
              <div className="remorph__drop-overlay">
                <LoadingState variant="overlay" />
              </div>
            )}
          </div>
        )}

        {!splitMode && image && <div className="remorph__panel">{editorPanel}</div>}
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

      {splitMode && (
        <DraggableEditorPanel>{editorPanel}</DraggableEditorPanel>
      )}

      <HistoryPanel
        albums={albums}
        onAlbumsChange={refreshAlbums}
        onSelectImage={handleSelectHistoryImage}
        onDeleteStep={handleDeleteStep}
        onDeleteAlbum={handleDeleteAlbum}
      />
    </div>
  );
}
