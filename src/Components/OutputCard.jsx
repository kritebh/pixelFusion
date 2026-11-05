import { formatBytes } from "../utils/formats";
import { DownloadIcon, SpinnerIcon } from "./icons";

export const SizeDelta = ({ from, to }) => {
  const change = Math.round(((to - from) / from) * 100);

  if (Math.abs(change) < 2) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        About the same size
      </span>
    );
  }
  return change < 0 ? (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      {Math.abs(change)}% smaller
    </span>
  ) : (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
      {change}% larger
    </span>
  );
};

/**
 * R3 — the finished result is on screen before anything is asked of the user:
 * the real converted picture, at its real byte size, rendered from the exact
 * bytes the download button will save.
 *
 * R6 — the output size is never shown alone. The original sits immediately
 * before it, so the number is read against a reference the user already
 * accepted rather than in a vacuum.
 *
 * R4 — the filename is theirs to set before they commit to saving.
 */
const OutputCard = ({
  preview,
  sourceBytes,
  format,
  size,
  outName,
  onNameChange,
  onDownload,
  downloadedName,
}) => {
  const busy = preview.status === "working";
  const ready = preview.status === "ready";
  const filename = `${outName || "image"}.${format.ext}`;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200/80 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Your converted file</h2>
        <p className="hint mt-0.5">Ready before you download — nothing was sent anywhere.</p>
      </div>

      <div className="checkerboard flex min-h-[13rem] items-center justify-center border-b border-slate-200/80 p-5">
        {preview.url ? (
          <img
            src={preview.url}
            alt={`Converted preview: ${filename}`}
            className={`max-h-56 w-auto max-w-full rounded-lg object-contain shadow-sm transition-opacity duration-200 ${
              busy ? "opacity-40" : "opacity-100"
            }`}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            {busy ? <SpinnerIcon className="h-5 w-5" /> : null}
            <p className="text-sm">
              {preview.status === "deferred"
                ? "This image is big enough that converting takes a moment."
                : busy
                ? "Converting…"
                : "Preview will appear here."}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4 p-5">
        {preview.status === "error" && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {preview.error}
          </p>
        )}

        {preview.status === "deferred" && (
          <button type="button" className="btn-outline w-full py-2.5" onClick={preview.run}>
            Convert it and show me the exact size
          </button>
        )}

        {/* The comparison, not the bare number. */}
        <dl className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <div>
            <dt className="hint">Original</dt>
            <dd className="text-sm font-semibold tabular-nums text-slate-500 line-through decoration-slate-300">
              {formatBytes(sourceBytes)}
            </dd>
          </div>
          <span aria-hidden="true" className="text-slate-300">→</span>
          <div>
            <dt className="hint">{format.label} · {size.width} × {size.height}</dt>
            <dd className="text-sm font-semibold tabular-nums text-slate-900">
              {ready ? formatBytes(preview.size) : busy ? "Calculating…" : "—"}
            </dd>
          </div>
          {ready && <SizeDelta from={sourceBytes} to={preview.size} />}
        </dl>

        <div>
          <label htmlFor="filename" className="hint mb-1 block font-medium">
            File name
          </label>
          <div className="flex items-center gap-2">
            <input
              id="filename"
              type="text"
              className="field"
              value={outName}
              onChange={(event) => onNameChange(event.target.value)}
              spellCheck="false"
            />
            <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-2 text-sm font-medium text-slate-600">
              .{format.ext}
            </span>
          </div>
        </div>

        {/* R1 — the button names what happens and what you get, not the mechanism. */}
        <button
          type="button"
          className="btn-primary w-full"
          onClick={onDownload}
          disabled={!ready}
        >
          {busy ? (
            <>
              <SpinnerIcon className="h-4 w-4" />
              Preparing your file…
            </>
          ) : (
            <>
              <DownloadIcon />
              <span className="truncate">
                Save {filename}
                {ready && ` · ${formatBytes(preview.size)}`}
              </span>
            </>
          )}
        </button>

        <p className="hint text-center">
          {downloadedName ? (
            <span className="font-medium text-emerald-700">
              Saved {downloadedName} to your downloads.
            </span>
          ) : (
            <>
              Press <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-slate-600">Enter</kbd> to save
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default OutputCard;
