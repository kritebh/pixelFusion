import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_DIMENSION, downloadBlob, loadImage } from "./utils/convert";
import { getFormat, getFormats, recommendFormat, safeStem } from "./utils/formats";
import {
  MAX_BATCH,
  asImageFile,
  collectDropped,
  fetchImageFile,
  parseUrls,
} from "./utils/sources";
import {
  DEFAULT_BATCH_SIZE,
  ORIGINAL,
  ORIGINAL_OPTION,
  assignFilenames,
  buildZip,
  settingsKey,
  stemOf,
} from "./utils/batch";
import useOutputPreview from "./hooks/useOutputPreview";
import useBatch, { needsWork } from "./hooks/useBatch";
import Headers from "./Components/Headers";
import Footer from "./Components/Footer";
import Dropzone from "./Components/Dropzone";
import UrlInput from "./Components/UrlInput";
import StepProgress from "./Components/StepProgress";
import FormatPicker from "./Components/FormatPicker";
import ResizeControls from "./Components/ResizeControls";
import BatchSizeControls from "./Components/BatchSizeControls";
import OutputCard from "./Components/OutputCard";
import BatchList from "./Components/BatchList";
import BatchSummary from "./Components/BatchSummary";
import Alert from "./Components/Alert";
import { ShieldIcon } from "./Components/icons";

const DEFAULT_QUALITY = 0.9;
const HEAVY_PIXELS = 24_000_000;
const PREFS_KEY = "pixelfusion:prefs";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Bulk settings from last time, with anything stale or unusable replaced. */
const readBatchSettings = (saved = {}, formats) => {
  const usable =
    saved.formatId === ORIGINAL || formats.some((f) => f.id === saved.formatId && f.available);
  const side = (value, fallback) =>
    Number.isFinite(value) && value >= 1 ? Math.min(MAX_DIMENSION, Math.round(value)) : fallback;
  return {
    formatId: usable ? saved.formatId : recommendFormat("", formats).id,
    resize: saved.resize === true,
    width: side(saved.width, DEFAULT_BATCH_SIZE.width),
    height: side(saved.height, DEFAULT_BATCH_SIZE.height),
    keepProportions: saved.keepProportions !== false,
  };
};

/** Says what was not added, and why. Silent when everything made it in. */
const describeLeftovers = ({ leftOut = 0, skipped = 0, noun = "image" }) => {
  const parts = [];
  if (leftOut > 0) {
    parts.push(
      `${plural(leftOut, `${noun} was`, `${noun}s were`)} left out, because a batch holds up to ${MAX_BATCH}.`
    );
  }
  if (skipped > 0) {
    parts.push(`Skipped ${plural(skipped, "file that is not an image", "files that are not images")}.`);
  }
  return parts.join(" ");
};

const readPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {};
  } catch (_) {
    return {};
  }
};

const writePrefs = (prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (_) {
    /* storage may be unavailable — preferences are a nicety, not a requirement */
  }
};

function App() {
  const formats = useMemo(() => getFormats(), []);
  const prefs = useMemo(readPrefs, []);

  const [fileInfo, setFileInfo] = useState(null);
  const [formatId, setFormatId] = useState(formats[0].id);
  const [recommendation, setRecommendation] = useState({ id: formats[0].id, reason: "" });
  const [quality, setQuality] = useState(
    typeof prefs.quality === "number" ? prefs.quality : DEFAULT_QUALITY
  );
  const [locked, setLocked] = useState(prefs.locked !== false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [outName, setOutName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [downloadedName, setDownloadedName] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);

  const [batchSettings, setBatchSettings] = useState(() => readBatchSettings(prefs.batch, formats));
  const [zipBusy, setZipBusy] = useState(false);
  const [savedZip, setSavedZip] = useState(null);

  const objectUrlRef = useRef("");
  const urlTicket = useRef(0);
  const format = getFormat(formatId);

  const batch = useBatch();
  const {
    items: batchItems,
    addFiles,
    addUrls,
    remove: removeFromBatch,
    clear: clearBatch,
    convert: convertBatch,
  } = batch;
  const inBulk = batchItems.length > 0;

  const preview = useOutputPreview({
    image: fileInfo?.image ?? null,
    width: size.width,
    height: size.height,
    formatId,
    quality,
  });

  useEffect(() => {
    writePrefs({ quality, locked, format: formatId, batch: batchSettings });
  }, [quality, locked, formatId, batchSettings]);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  }, []);

  const handleFile = useCallback(
    async (file) => {
      if (!file.type.startsWith("image/")) {
        setError("That file is not an image. Pick a PNG, JPEG, WebP, GIF, BMP or SVG.");
        return false;
      }

      setError("");
      setDownloadedName("");

      const url = URL.createObjectURL(file);
      try {
        const image = await loadImage(url);
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;

        if (!width || !height) {
          throw new Error("That image has no readable dimensions, so it cannot be resized.");
        }

        releaseObjectUrl();
        objectUrlRef.current = url;

        const stem = file.name.replace(/\.[^./\\]+$/, "") || "image";
        setFileInfo({
          image,
          filePath: url,
          fileName: file.name,
          stem,
          size: file.size,
          type: file.type,
          width,
          height,
        });

        // R1 — every control lands pre-filled: real dimensions, a recommended
        // format, and the name the file already had.
        setSize({ width, height });
        setOutName(stem);

        const recommended = recommendFormat(file.type, formats);
        setRecommendation(recommended);

        const remembered = formats.find((f) => f.id === prefs.format && f.available);
        setFormatId(remembered ? remembered.id : recommended.id);
        return true;
      } catch (err) {
        URL.revokeObjectURL(url);
        setError(err.message || "Could not read that image.");
        return false;
      }
    },
    [formats, prefs.format, releaseObjectUrl]
  );

  const handleReset = useCallback(() => {
    releaseObjectUrl();
    setFileInfo(null);
    setSize({ width: 0, height: 0 });
    setOutName("");
    setError("");
    setDownloadedName("");
  }, [releaseObjectUrl]);

  // Bringing in several images replaces a single loaded one, the same way
  // "Replace" does, and switches to the batch view.
  // A single link still downloading must not open on top of whatever the user
  // brought in since, so newer input invalidates it.
  const supersedeLink = useCallback(() => {
    urlTicket.current += 1;
    setUrlBusy(false);
  }, []);

  const startBatch = useCallback(() => {
    supersedeLink();
    if (fileInfo) handleReset();
  }, [fileInfo, handleReset, supersedeLink]);

  /**
   * One link outside a batch opens like a dropped file. Several links, or any
   * link while a batch is open, join the batch, where each one loads (or fails
   * with its reason) on its own row. Resolves true once the links are taken,
   * so the link box knows it can clear.
   */
  const handleUrls = useCallback(
    async (urls) => {
      setError("");
      setNotice("");

      if (!inBulk && urls.length === 1) {
        urlTicket.current += 1;
        const ticket = urlTicket.current;
        setUrlBusy(true);
        try {
          const file = await fetchImageFile(urls[0]);
          if (ticket !== urlTicket.current) return false;
          return await handleFile(file);
        } catch (err) {
          if (ticket === urlTicket.current) setError(err.message);
          return false;
        } finally {
          if (ticket === urlTicket.current) setUrlBusy(false);
        }
      }

      startBatch();
      const { leftOut } = addUrls(urls);
      setNotice(describeLeftovers({ leftOut, noun: "link" }));
      return true;
    },
    [inBulk, handleFile, startBatch, addUrls]
  );

  /** Files and folders from the picker, a drop, or the clipboard. */
  const handleIncoming = useCallback(
    async (pending) => {
      const { files = [], total = files.length, skipped = 0, urls = [], error: readError } =
        await pending;
      setError("");
      setNotice("");

      if (readError) {
        setError(readError);
        return;
      }
      if (!files.length && urls.length) {
        handleUrls(urls);
        return;
      }
      if (!files.length) {
        setError(
          skipped
            ? "None of those files are images. Pick PNG, JPEG, WebP, GIF, BMP or SVG files."
            : "No images were found there."
        );
        return;
      }
      if (!inBulk && total === 1) {
        supersedeLink();
        if (await handleFile(files[0])) setNotice(describeLeftovers({ skipped }));
        return;
      }

      startBatch();
      const { leftOut } = addFiles(files);
      setNotice(describeLeftovers({ leftOut: leftOut + (total - files.length), skipped }));
    },
    [inBulk, handleFile, handleUrls, startBatch, supersedeLink, addFiles]
  );

  // ⌘V / Ctrl+V anywhere outside a text field: a copied image, or copied links.
  useEffect(() => {
    const onPaste = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      const data = event.clipboardData;
      if (!data) return;

      const files = Array.from(data.files ?? []).map(asImageFile).filter(Boolean);
      if (files.length) {
        event.preventDefault();
        handleIncoming({ files });
        return;
      }
      // Only text that is entirely links, so a stray paste of prose does nothing.
      const { urls, invalid } = parseUrls(data.getData("text/plain"));
      if (urls.length && !invalid.length) {
        event.preventDefault();
        handleUrls(urls);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleIncoming, handleUrls]);

  // A file dropped outside the drop areas would make the browser open it in
  // place of this page, throwing away a converted batch. Treat it as input.
  // Drops the drop areas already handled arrive here default-prevented.
  useEffect(() => {
    const carriesFiles = (event) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const onDragOver = (event) => {
      if (carriesFiles(event)) event.preventDefault();
    };
    const onDrop = (event) => {
      if (event.defaultPrevented || !carriesFiles(event)) return;
      event.preventDefault();
      handleIncoming(collectDropped(event.dataTransfer));
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleIncoming]);

  // ---- Bulk ----

  const batchFormats = useMemo(() => [ORIGINAL_OPTION, ...formats], [formats]);
  const batchRecommendedId = useMemo(() => recommendFormat("", formats).id, [formats]);
  const batchConfig = useMemo(() => ({ ...batchSettings, quality }), [batchSettings, quality]);
  const batchKey = settingsKey(batchConfig);

  const updateBatchSettings = useCallback(
    (values) => setBatchSettings((prev) => ({ ...prev, ...values })),
    []
  );

  const batchView = useMemo(() => {
    const items = batchItems;
    const usable = items.filter((i) => i.status === "ready" || i.status === "converting");
    const current = items.filter((i) => i.outcome?.key === batchKey);
    const converted = current.filter((i) => !i.outcome.error);
    return {
      converted,
      names: assignFilenames(
        converted.map((i) => ({ id: i.id, stem: stemOf(i.name), ext: i.outcome.ext }))
      ),
      pending: items.filter((i) => needsWork(i, batchKey)).length,
      stale: items.filter((i) => i.status === "ready" && i.outcome && i.outcome.key !== batchKey)
        .length,
      loading: items.filter((i) => i.status === "loading").length,
      failed:
        items.filter((i) => i.status === "failed").length +
        current.filter((i) => i.outcome.error).length,
      shapes: usable.map((i) => ({ width: i.width, height: i.height })),
      readyCount: usable.length,
      readyBytes: usable.reduce((sum, i) => sum + i.bytes, 0),
      fromBytes: converted.reduce((sum, i) => sum + i.bytes, 0),
      toBytes: converted.reduce((sum, i) => sum + i.outcome.size, 0),
      // Identifies exactly which results a saved ZIP held.
      signature: `${batchKey}#${converted.map((i) => i.id).join(",")}`,
    };
  }, [batchItems, batchKey]);

  const zipIsSaved = Boolean(savedZip) && savedZip.signature === batchView.signature;

  const handleConvertBatch = useCallback(() => {
    setError("");
    convertBatch(batchConfig);
  }, [convertBatch, batchConfig]);

  const handleSaveZip = useCallback(async () => {
    const { converted, names, signature } = batchView;
    if (!converted.length) return;
    setZipBusy(true);
    setError("");
    try {
      const entries = converted.map((i) => ({ name: names.get(i.id), blob: i.outcome.blob }));
      const blob = await buildZip(entries);
      const name = `pixelfusion-${entries.length}-${entries.length === 1 ? "image" : "images"}.zip`;
      downloadBlob(blob, name);
      setSavedZip({ name, signature });
    } catch (err) {
      setError(`The ZIP could not be built. ${err.message || ""}`.trim());
    } finally {
      setZipBusy(false);
    }
  }, [batchView]);

  const handleDownloadOne = useCallback(
    (item) => downloadBlob(item.outcome.blob, batchView.names.get(item.id)),
    [batchView.names]
  );

  const handleClearBatch = useCallback(() => {
    clearBatch();
    setSavedZip(null);
    setNotice("");
    setError("");
  }, [clearBatch]);

  const handleRemove = useCallback(
    (id) => {
      removeFromBatch(id);
      // Removing the last image returns to the start screen, where a note
      // about what the batch left out no longer refers to anything.
      if (batchItems.length <= 1) setNotice("");
    },
    [removeFromBatch, batchItems.length]
  );

  const batchClearCost =
    batchView.converted.length && !zipIsSaved
      ? `${plural(batchView.converted.length, "converted file", "converted files")} you have not saved yet`
      : null;

  const batchAlphaWarning =
    batchSettings.formatId !== ORIGINAL &&
    !getFormat(batchSettings.formatId)?.alpha &&
    batchItems.some((i) => i.type && i.type !== "image/jpeg");

  const handleDownload = useCallback(() => {
    if (!preview.blob || !fileInfo) return;
    const filename = `${safeStem(outName, fileInfo.stem)}.${format.ext}`;
    downloadBlob(preview.blob, filename);
    setDownloadedName(filename);
  }, [preview.blob, fileInfo, outName, format]);

  // A "Saved" note that outlives the settings it described would be a false
  // claim, so it is cleared whenever the output changes.
  useEffect(() => {
    setDownloadedName("");
  }, [formatId, quality, size.width, size.height]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Enter" || preview.status !== "ready") return;
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) return;
      event.preventDefault();
      handleDownload();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDownload, preview.status]);

  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

  /**
   * R5 — describe the real cost of starting over, drawn from what the user
   * actually changed. When nothing would be lost, there is nothing to warn
   * about and the button just works.
   */
  const resetCost = useMemo(() => {
    if (!fileInfo) return null;
    const changes = [];
    if (formatId !== recommendation.id) changes.push(`the ${format.label} output you picked`);
    if (size.width !== fileInfo.width || size.height !== fileInfo.height) {
      changes.push(`the ${size.width} × ${size.height} resize`);
    }
    if (outName !== fileInfo.stem) changes.push(`the name "${outName}"`);
    if (quality !== DEFAULT_QUALITY && format.quality) {
      changes.push(`quality at ${Math.round(quality * 100)}%`);
    }
    if (!changes.length) return null;

    const list =
      changes.length === 1
        ? changes[0]
        : `${changes.slice(0, -1).join(", ")} and ${changes[changes.length - 1]}`;
    return `${list} for ${fileInfo.fileName}`;
  }, [fileInfo, formatId, recommendation.id, format, size, outName, quality]);

  const readyStep = {
    id: "ready",
    label: "Converter ready",
    headline: "Converter loaded — it runs on your device",
    done: true,
  };

  const batchConverted =
    batchView.converted.length > 0 && batchView.pending === 0 && batchView.loading === 0;

  const batchSteps = [
    readyStep,
    { id: "images", label: "Add images", headline: "Add your images", done: true },
    {
      id: "convert",
      label: "Format, size & convert",
      headline: "Check the format and size, then convert",
      done: batchConverted,
    },
    {
      id: "save",
      label: "Save the ZIP",
      headline: "Save the ZIP",
      done: batchConverted && zipIsSaved,
    },
  ];

  const singleSteps = [
    readyStep,
    {
      id: "image",
      label: "Choose an image",
      headline: "Choose an image",
      done: Boolean(fileInfo),
    },
    {
      id: "settings",
      label: "Format & size",
      headline: "Check the format and size",
      done: Boolean(fileInfo) && preview.status === "ready",
    },
    {
      id: "save",
      label: "Save it",
      headline: "Save your file",
      done: Boolean(downloadedName),
    },
  ];

  const steps = inBulk ? batchSteps : singleSteps;

  const alphaWarning =
    Boolean(fileInfo) && fileInfo.type !== "image/jpeg" && format && !format.alpha;
  const heavyImage = Boolean(fileInfo) && fileInfo.width * fileInfo.height > HEAVY_PIXELS;

  return (
    <div className="flex min-h-screen flex-col">
      <Headers />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {!fileInfo && !inBulk && (
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Convert and resize images
              <span className="block text-emerald-600">without uploading them anywhere</span>
            </h1>
          </div>
        )}

        <StepProgress steps={steps} />

        {error && (
          <div className="mt-5">
            <Alert tone="error" title="That did not work">
              {error}
            </Alert>
          </div>
        )}

        {notice && (
          <div className="mt-5">
            <Alert tone="warning" title="Not everything was added">
              {notice}
            </Alert>
          </div>
        )}

        {inBulk ? (
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
            <div className="space-y-5">
              <BatchList
                items={batchItems}
                currentKey={batchKey}
                names={batchView.names}
                running={batch.running}
                onIncoming={handleIncoming}
                onAddUrls={handleUrls}
                onRemove={handleRemove}
                onDownloadOne={handleDownloadOne}
                onClear={handleClearBatch}
                clearCost={batchClearCost}
              />

              <div className="card animate-fade-up space-y-6 p-5">
                <FormatPicker
                  formats={batchFormats}
                  value={batchSettings.formatId}
                  onChange={(id) => updateBatchSettings({ formatId: id })}
                  recommendedId={batchRecommendedId}
                  quality={quality}
                  onQualityChange={setQuality}
                  alphaWarning={batchAlphaWarning}
                />

                <hr className="border-slate-200/80" />

                <BatchSizeControls
                  settings={batchSettings}
                  onChange={updateBatchSettings}
                  shapes={batchView.shapes}
                />
              </div>
            </div>

            <div className="lg:sticky lg:top-24">
              <BatchSummary
                view={batchView}
                running={batch.running}
                progress={batch.progress}
                onConvert={handleConvertBatch}
                onStop={batch.stop}
                onSaveZip={handleSaveZip}
                zipBusy={zipBusy}
                savedName={zipIsSaved ? savedZip.name : ""}
              />
            </div>
          </div>
        ) : (
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
            <div className="space-y-5">
              <Dropzone
                fileInfo={fileInfo}
                onIncoming={handleIncoming}
                onReset={handleReset}
                resetCost={resetCost}
              />

              {!fileInfo && (
                <div className="card p-4 sm:p-5">
                  <UrlInput onSubmit={handleUrls} busy={urlBusy} />
                </div>
              )}

              {fileInfo && (
                <div className="card animate-fade-up space-y-6 p-5">
                  <FormatPicker
                    formats={formats}
                    value={formatId}
                    onChange={setFormatId}
                    recommendedId={recommendation.id}
                    quality={quality}
                    onQualityChange={setQuality}
                    alphaWarning={alphaWarning}
                  />

                  <hr className="border-slate-200/80" />

                  <ResizeControls
                    source={{ width: fileInfo.width, height: fileInfo.height }}
                    size={size}
                    onSizeChange={setSize}
                    locked={locked}
                    onLockChange={setLocked}
                  />
                </div>
              )}

              {heavyImage && (
                <Alert tone="warning" title="This is a large image">
                  Above roughly 24 million pixels, converting takes a noticeable
                  moment and some browsers give up entirely. Resizing it down first
                  makes it much more likely to finish.
                </Alert>
              )}
            </div>

            <div className="lg:sticky lg:top-24">
              {fileInfo ? (
                <OutputCard
                  preview={preview}
                  sourceBytes={fileInfo.size}
                  format={format}
                  size={size}
                  outName={outName}
                  onNameChange={setOutName}
                  onDownload={handleDownload}
                  downloadedName={downloadedName}
                />
              ) : (
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-slate-900">How this works</h2>
                  <ol className="mt-3 space-y-3">
                    {[
                      "Pick an image, several, or a whole folder, or paste a link. Files are read straight from your disk into this page.",
                      "Format and size arrive pre-filled, so usually there is nothing to change.",
                      "You see the finished file and its exact size, then choose whether to save it. A batch saves as one ZIP.",
                    ].map((line, index) => (
                      <li key={line} className="flex gap-3 text-sm text-slate-600">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {index + 1}
                        </span>
                        {line}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                    <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      There is no account, no upload and no server. A link is
                      downloaded by your browser straight from the site that hosts
                      it. Close the tab and every trace of your images is gone.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
