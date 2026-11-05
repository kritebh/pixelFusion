import { useRef, useState } from "react";
import { formatBytes } from "../utils/formats";
import { MAX_BATCH, asFolderPicker, collectDropped, collectPicked } from "../utils/sources";
import useDropTarget from "../hooks/useDropTarget";
import { FolderIcon, UploadIcon } from "./icons";

/** Reads the picked files before the input is cleared for the next pick. */
const pickedFrom = (event) => {
  const files = Array.from(event.target.files ?? []);
  event.target.value = "";
  return files;
};

const Dropzone = ({ fileInfo, onIncoming, onReset, resetCost }) => {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const replaceRef = useRef(null);
  const folderRef = useRef(null);
  const { dragging, dragProps } = useDropTarget((data) => onIncoming(collectDropped(data)));

  const handlePick = (event) => {
    const files = pickedFrom(event);
    if (files.length) onIncoming(collectPicked(files));
  };

  if (!fileInfo) {
    return (
      <div className="space-y-2.5">
        <label
          {...dragProps}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition duration-150 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20 sm:p-10 ${
            dragging
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-300 bg-white/70 hover:border-emerald-400 hover:bg-emerald-50/40"
          }`}
        >
          <input type="file" accept="image/*" multiple className="sr-only" onChange={handlePick} />
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <UploadIcon />
          </span>
          <span className="text-base font-semibold text-slate-900">
            Drop images or a folder here, or click to browse
          </span>
          <span className="hint max-w-sm">
            One image, several at once, or a whole folder of up to {MAX_BATCH}. PNG,
            JPEG, WebP, GIF, BMP or SVG. Nothing is uploaded, so there is no size
            limit or wait.
          </span>
        </label>

        <div className="flex justify-center">
          <button type="button" className="btn-ghost" onClick={() => folderRef.current?.click()}>
            <FolderIcon />
            Choose a folder
          </button>
          {/* The visible button is the control; this input only opens the picker. */}
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
    );
  }

  return (
    <div
      {...dragProps}
      className={`card p-4 transition duration-150 ${
        dragging ? "border-emerald-500 ring-4 ring-emerald-500/20" : ""
      }`}
    >
      {/* The action buttons drop to their own row below `sm`, so the file name
          keeps enough width to read instead of truncating to a few letters. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="checkerboard h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200">
          <img
            src={fileInfo.filePath}
            alt={`Original: ${fileInfo.fileName}`}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-[8rem] flex-1">
          <p className="truncate text-sm font-semibold text-slate-900" title={fileInfo.fileName}>
            {fileInfo.fileName}
          </p>
          <p className="hint mt-0.5 tabular-nums">
            {fileInfo.width} × {fileInfo.height} px · {formatBytes(fileInfo.size)}
          </p>
        </div>

        <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
          <button
            type="button"
            className="btn-outline"
            onClick={() => replaceRef.current?.click()}
          >
            Replace
          </button>
          <input
            ref={replaceRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePick}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => (resetCost ? setConfirmingReset(true) : onReset())}
          >
            Start over
          </button>
        </div>
      </div>

      {/* R5 — the exit stays one click away, but it names the real consequence
          instead of a neutral "Are you sure?". No shaming, no penalty. */}
      {confirmingReset && (
        <div className="animate-fade-up mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            Starting over clears {resetCost}. You would set them up again from scratch.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setConfirmingReset(false)}
            >
              Keep my settings
            </button>
            <button
              type="button"
              className="btn px-3 py-2 text-amber-800 underline underline-offset-4 hover:text-amber-900"
              onClick={() => {
                setConfirmingReset(false);
                onReset();
              }}
            >
              Clear it anyway
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropzone;
