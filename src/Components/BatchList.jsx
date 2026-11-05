import { useRef, useState } from "react";
import { formatBytes } from "../utils/formats";
import { MAX_BATCH, asFolderPicker, collectDropped, collectPicked, hostOf } from "../utils/sources";
import useDropTarget from "../hooks/useDropTarget";
import UrlInput from "./UrlInput";
import { CloseIcon, DownloadIcon, FolderIcon, LinkIcon, SpinnerIcon, UploadIcon } from "./icons";

const Change = ({ from, to }) => {
  const change = Math.round(((to - from) / from) * 100);
  if (!Number.isFinite(change) || Math.abs(change) < 2) {
    return <span className="text-slate-500">same size</span>;
  }
  return change < 0 ? (
    <span className="font-semibold text-emerald-700">{Math.abs(change)}% smaller</span>
  ) : (
    <span className="font-semibold text-amber-700">{change}% larger</span>
  );
};

const Detail = ({ item, isCurrent, filename }) => {
  const source =
    item.width > 0 ? `${item.width} × ${item.height} · ${formatBytes(item.bytes)}` : formatBytes(item.bytes);

  if (item.status === "loading") {
    return (
      <p className="hint">
        {item.origin === "url" ? `Downloading from ${hostOf(item.url)}…` : "Reading…"}
      </p>
    );
  }
  if (item.status === "failed") {
    return <p className="text-xs leading-relaxed text-red-700">{item.error}</p>;
  }
  if (item.status === "converting") {
    return (
      <p className="hint flex items-center gap-1.5 font-medium text-emerald-700">
        <SpinnerIcon className="h-3 w-3" />
        Converting…
      </p>
    );
  }

  const { outcome } = item;
  if (outcome && isCurrent && outcome.error) {
    return <p className="text-xs leading-relaxed text-red-700">Could not convert: {outcome.error}</p>;
  }
  if (outcome && isCurrent) {
    return (
      <div className="space-y-0.5">
        <p className="hint tabular-nums">
          {source}
          <span className="mx-1 text-slate-400">→</span>
          <span className="font-medium text-slate-700">
            {filename} · {outcome.width} × {outcome.height} · {formatBytes(outcome.size)}
          </span>
          <span className="mx-1 text-slate-300">·</span>
          <Change from={item.bytes} to={outcome.size} />
        </p>
        {outcome.note && <p className="text-xs leading-relaxed text-amber-800">{outcome.note}</p>}
      </div>
    );
  }
  return (
    <p className="hint tabular-nums">
      {source}
      {outcome && (
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
          Out of date
        </span>
      )}
    </p>
  );
};

const Thumb = ({ item }) => (
  <div className="checkerboard flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200">
    {item.objectUrl && item.status !== "failed" ? (
      // Lazy, so a hundred full-size photos are not all decoded at once just
      // to draw 44-pixel squares that are mostly scrolled out of view.
      <img
        src={item.objectUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain"
      />
    ) : item.status === "loading" ? (
      <SpinnerIcon className="h-4 w-4 text-slate-400" />
    ) : item.origin === "url" ? (
      <LinkIcon className="h-4 w-4 text-slate-400" />
    ) : null}
  </div>
);

/**
 * Every file in the batch, each with what happened to it. One bad file is
 * marked with its reason and never stops the others.
 */
const BatchList = ({
  items,
  currentKey,
  names,
  running,
  onIncoming,
  onAddUrls,
  onRemove,
  onDownloadOne,
  onClear,
  clearCost,
}) => {
  const [addingLinks, setAddingLinks] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const filesRef = useRef(null);
  const folderRef = useRef(null);
  const { dragging, dragProps } = useDropTarget((data) => onIncoming(collectDropped(data)));

  const full = items.length >= MAX_BATCH;

  const handlePick = (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length) onIncoming(collectPicked(files));
  };

  return (
    <div
      {...dragProps}
      className={`card overflow-hidden transition duration-150 ${
        dragging ? "border-emerald-500 ring-4 ring-emerald-500/20" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200/80 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {items.length} {items.length === 1 ? "image" : "images"}
          </h2>
          <p className="hint">
            {full ? `The batch is full at ${MAX_BATCH}.` : `Up to ${MAX_BATCH}. Drop more here to add them.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className="btn-outline"
            disabled={full}
            onClick={() => filesRef.current?.click()}
          >
            <UploadIcon className="h-4 w-4" />
            Add files
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={full}
            onClick={() => folderRef.current?.click()}
          >
            <FolderIcon />
            Folder
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={full}
            aria-expanded={addingLinks}
            onClick={() => setAddingLinks((open) => !open)}
          >
            <LinkIcon />
            Links
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={running}
            onClick={() => (clearCost ? setConfirmingClear(true) : onClear())}
          >
            Clear all
          </button>
          <input
            ref={filesRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handlePick}
          />
          <input
            ref={(node) => {
              folderRef.current = node;
              asFolderPicker(node);
            }}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handlePick}
          />
        </div>
      </div>

      {confirmingClear && (
        <div className="animate-fade-up border-b border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            Clearing removes {clearCost}. You would have to convert them again.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" className="btn-outline" onClick={() => setConfirmingClear(false)}>
              Keep them
            </button>
            <button
              type="button"
              className="btn px-3 py-2 text-amber-800 underline underline-offset-4 hover:text-amber-900"
              onClick={() => {
                setConfirmingClear(false);
                onClear();
              }}
            >
              Clear anyway
            </button>
          </div>
        </div>
      )}

      {addingLinks && !full && (
        <div className="animate-fade-up border-b border-slate-200/80 bg-slate-50/60 px-4 py-3">
          <UrlInput
            label="Add image links"
            onSubmit={async (urls) => {
              const accepted = await onAddUrls(urls);
              if (accepted) setAddingLinks(false);
              return accepted;
            }}
          />
        </div>
      )}

      <ul className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto">
        {items.map((item) => {
          const isCurrent = item.outcome?.key === currentKey;
          const downloadable = isCurrent && item.outcome && !item.outcome.error;
          const filename = names.get(item.id);

          return (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <Thumb item={item} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900" title={item.url || item.name}>
                  {item.name}
                </p>
                <Detail item={item} isCurrent={isCurrent} filename={filename} />
              </div>

              <div className="flex shrink-0 items-center">
                {downloadable && (
                  <button
                    type="button"
                    className="btn-ghost p-2"
                    title={`Save ${filename}`}
                    onClick={() => onDownloadOne(item)}
                  >
                    <DownloadIcon />
                    <span className="sr-only">Save {filename}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost p-2"
                  title="Remove from batch"
                  disabled={running}
                  onClick={() => onRemove(item.id)}
                >
                  <CloseIcon />
                  <span className="sr-only">Remove {item.name}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BatchList;
