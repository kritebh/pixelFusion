import { formatBytes } from "../utils/formats";
import { SizeDelta } from "./OutputCard";
import { DownloadIcon, SpinnerIcon } from "./icons";

const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The bulk counterpart of OutputCard. Converting is an explicit step, because
 * re-encoding a hundred images on every slider move would freeze the page.
 * Once settings change, the finished results are called out as out of date
 * rather than saved under settings they were not made with.
 */
const BatchSummary = ({
  view,
  running,
  progress,
  onConvert,
  onStop,
  onSaveZip,
  zipBusy,
  savedName,
}) => {
  const { converted, pending, stale, loading, failed, fromBytes, toBytes, readyCount, readyBytes } = view;
  const done = converted.length;
  // Links still downloading would be missing from the ZIP, so wait for them.
  const canSave = !running && pending === 0 && loading === 0 && done > 0;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200/80 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Your converted files</h2>
        <p className="hint mt-0.5">Converted on this device. Nothing is sent anywhere.</p>
      </div>

      <div className="space-y-4 p-5">
        {running && (
          <div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-800">
                Converting {Math.min(progress.done + 1, progress.total)} of {progress.total}
              </span>
              <span className="text-xs font-medium tabular-nums text-emerald-700">{percent}%</span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Converted ${progress.done} of ${progress.total}`}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {done > 0 ? (
          <dl className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <dt className="hint">Original</dt>
              <dd className="text-sm font-semibold tabular-nums text-slate-500 line-through decoration-slate-300">
                {formatBytes(fromBytes)}
              </dd>
            </div>
            <span aria-hidden="true" className="text-slate-300">→</span>
            <div>
              <dt className="hint">{count(done, "file")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-slate-900">{formatBytes(toBytes)}</dd>
            </div>
            <SizeDelta from={fromBytes} to={toBytes} />
          </dl>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {readyCount
              ? `${count(readyCount, "image")} ready to convert · ${formatBytes(readyBytes)}`
              : loading
              ? "Loading your images…"
              : "Nothing to convert yet."}
          </p>
        )}

        {(stale > 0 || loading > 0 || failed > 0) && (
          <ul className="space-y-1.5 text-xs leading-relaxed">
            {stale > 0 && !running && (
              <li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                You changed the settings, so {count(stale, "result is", "results are")} out of date.
                Convert again to apply the new settings.
              </li>
            )}
            {loading > 0 && <li className="text-slate-500">{count(loading, "image is", "images are")} still loading.</li>}
            {failed > 0 && (
              <li className="text-red-700">
                {count(failed, "file")} could not be used and will be left out of the ZIP. The list
                shows why.
              </li>
            )}
          </ul>
        )}

        {canSave ? (
          <button type="button" className="btn-primary w-full" onClick={onSaveZip} disabled={zipBusy}>
            {zipBusy ? (
              <>
                <SpinnerIcon className="h-4 w-4" />
                Building the ZIP…
              </>
            ) : (
              <>
                <DownloadIcon />
                <span className="truncate">
                  Save ZIP · {count(done, "file")} · {formatBytes(toBytes)}
                </span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary w-full"
            onClick={onConvert}
            disabled={running || pending === 0}
          >
            {running ? (
              <>
                <SpinnerIcon className="h-4 w-4" />
                Converting…
              </>
            ) : pending > 0 ? (
              `Convert ${count(pending, "image")}${stale === pending ? " again" : ""}`
            ) : loading > 0 ? (
              <>
                <SpinnerIcon className="h-4 w-4" />
                Waiting for images to load…
              </>
            ) : (
              "Nothing to convert"
            )}
          </button>
        )}

        {running && (
          <button type="button" className="btn-ghost w-full" onClick={onStop}>
            Stop after this file
          </button>
        )}

        {savedName && canSave && (
          <p className="hint text-center font-medium text-emerald-700">
            Saved {savedName} to your downloads.
          </p>
        )}
      </div>
    </div>
  );
};

export default BatchSummary;
