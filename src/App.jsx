import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { downloadBlob, loadImage } from "./utils/convert";
import { getFormat, getFormats, recommendFormat, safeStem } from "./utils/formats";
import useOutputPreview from "./hooks/useOutputPreview";
import Headers from "./Components/Headers";
import Footer from "./Components/Footer";
import Dropzone from "./Components/Dropzone";
import StepProgress from "./Components/StepProgress";
import FormatPicker from "./Components/FormatPicker";
import ResizeControls from "./Components/ResizeControls";
import OutputCard from "./Components/OutputCard";
import Alert from "./Components/Alert";
import { ShieldIcon } from "./Components/icons";

const DEFAULT_QUALITY = 0.9;
const HEAVY_PIXELS = 24_000_000;
const PREFS_KEY = "pixelfusion:prefs";

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
  const [downloadedName, setDownloadedName] = useState("");

  const objectUrlRef = useRef("");
  const format = getFormat(formatId);

  const preview = useOutputPreview({
    image: fileInfo?.image ?? null,
    width: size.width,
    height: size.height,
    formatId,
    quality,
  });

  useEffect(() => {
    writePrefs({ quality, locked, format: formatId });
  }, [quality, locked, formatId]);

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
        return;
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
      } catch (err) {
        URL.revokeObjectURL(url);
        setError(err.message || "Could not read that image.");
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

  const steps = [
    {
      id: "ready",
      label: "Converter ready",
      headline: "Converter loaded — it runs on your device",
      done: true,
    },
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

  const alphaWarning =
    Boolean(fileInfo) && fileInfo.type !== "image/jpeg" && format && !format.alpha;
  const heavyImage = Boolean(fileInfo) && fileInfo.width * fileInfo.height > HEAVY_PIXELS;

  return (
    <div className="flex min-h-screen flex-col">
      <Headers />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {!fileInfo && (
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Convert and resize an image
              <span className="block text-emerald-600">without uploading it anywhere</span>
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

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
          <div className="space-y-5">
            <Dropzone
              fileInfo={fileInfo}
              onFile={handleFile}
              onReset={handleReset}
              resetCost={resetCost}
            />

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
                    "Pick an image. It is read straight from your disk into this page.",
                    "Format and size arrive pre-filled, so usually there is nothing to change.",
                    "You see the finished file and its exact size, then choose whether to save it.",
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
                    There is no account, no upload and no server. Close the tab and
                    every trace of your image is gone.
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
