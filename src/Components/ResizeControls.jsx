import { useEffect, useState } from "react";
import { MAX_DIMENSION } from "../utils/convert";
import { LockIcon } from "./icons";

const PRESETS = [1, 0.75, 0.5, 0.25];

const clamp = (value) => Math.max(1, Math.min(MAX_DIMENSION, Math.round(value)));

/**
 * R1 — the size fields arrive filled in with the image's real dimensions, the
 * aspect-ratio lock is on by default, and the common cases are one tap away, so
 * resizing is a scan-and-adjust job rather than arithmetic.
 */
const ResizeControls = ({ source, size, onSizeChange, locked, onLockChange }) => {
  const [draft, setDraft] = useState({ width: String(size.width), height: String(size.height) });

  useEffect(() => {
    setDraft({ width: String(size.width), height: String(size.height) });
  }, [size.width, size.height]);

  const ratio = source.width / source.height;

  const applyScale = (scale) =>
    onSizeChange({
      width: clamp(source.width * scale),
      height: clamp(source.height * scale),
    });

  const handleDimension = (axis) => (event) => {
    const raw = event.target.value;
    setDraft((prev) => ({ ...prev, [axis]: raw }));

    const parsed = Number(raw);
    if (!raw || !Number.isFinite(parsed) || parsed < 1) return;

    const value = clamp(parsed);
    if (!locked) {
      onSizeChange({ ...size, [axis]: value });
      return;
    }
    onSizeChange(
      axis === "width"
        ? { width: value, height: clamp(value / ratio) }
        : { width: clamp(value * ratio), height: value }
    );
  };

  const restoreDraft = () =>
    setDraft({ width: String(size.width), height: String(size.height) });

  const activeScale = PRESETS.find(
    (scale) => Math.abs(clamp(source.width * scale) - size.width) <= 1
  );
  const percentOfOriginal = Math.round((size.width / source.width) * 100);

  return (
    <fieldset>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <legend className="label">Size</legend>
        {/* R6 — the new dimensions never appear on their own; the original sits
            right next to them as the reference point. */}
        <p className="hint tabular-nums">
          {source.width} × {source.height}
          <span className="mx-1.5 text-slate-400">→</span>
          <span className="font-semibold text-slate-700">
            {size.width} × {size.height}
          </span>
          <span className="ml-1.5">({percentOfOriginal}% of original)</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((scale) => (
          <button
            key={scale}
            type="button"
            onClick={() => applyScale(scale)}
            aria-pressed={activeScale === scale}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums transition duration-150 ${
              activeScale === scale
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {scale === 1 ? "Original" : `${scale * 100}%`}
          </button>
        ))}
        {!activeScale && (
          <span className="inline-flex items-center rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
            Custom
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="width" className="hint mb-1 block font-medium">
            Width (px)
          </label>
          <input
            id="width"
            name="width"
            type="number"
            min="1"
            max={MAX_DIMENSION}
            inputMode="numeric"
            className="field tabular-nums"
            value={draft.width}
            onChange={handleDimension("width")}
            onBlur={restoreDraft}
          />
        </div>

        <button
          type="button"
          onClick={() => onLockChange(!locked)}
          aria-pressed={locked}
          title={locked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
          className={`mb-1 rounded-lg border p-2 transition duration-150 ${
            locked
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
          }`}
        >
          <LockIcon open={!locked} />
          <span className="sr-only">
            {locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <label htmlFor="height" className="hint mb-1 block font-medium">
            Height (px)
          </label>
          <input
            id="height"
            name="height"
            type="number"
            min="1"
            max={MAX_DIMENSION}
            inputMode="numeric"
            className="field tabular-nums"
            value={draft.height}
            onChange={handleDimension("height")}
            onBlur={restoreDraft}
          />
        </div>
      </div>

      <p className="hint mt-2">
        {locked
          ? "Aspect ratio is locked, so the other side follows along."
          : "Aspect ratio unlocked — the picture may look stretched."}
      </p>
    </fieldset>
  );
};

export default ResizeControls;
