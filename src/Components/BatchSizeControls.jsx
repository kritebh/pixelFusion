import { useEffect, useState } from "react";
import { MAX_DIMENSION } from "../utils/convert";
import { CheckIcon } from "./icons";

const clamp = (value) => Math.max(1, Math.min(MAX_DIMENSION, Math.round(value)));

const MODES = [
  { resize: false, title: "Keep each size", hint: "Only the format changes" },
  { resize: true, title: "Same size for all", hint: "One size for every image" },
];

/**
 * Bulk sizing: either leave every image at its own size, or give them all one
 * size. With "keep proportions" on, each image fits inside that box instead of
 * being stretched to it, because a batch rarely shares a single shape.
 */
const BatchSizeControls = ({ settings, onChange, shapes }) => {
  const { resize, width, height, keepProportions } = settings;
  const [draft, setDraft] = useState({ width: String(width), height: String(height) });

  useEffect(() => {
    setDraft({ width: String(width), height: String(height) });
  }, [width, height]);

  const handleDimension = (axis) => (event) => {
    const raw = event.target.value;
    setDraft((prev) => ({ ...prev, [axis]: raw }));
    const parsed = Number(raw);
    if (!raw || !Number.isFinite(parsed) || parsed < 1) return;
    onChange({ [axis]: clamp(parsed) });
  };

  const restoreDraft = () => setDraft({ width: String(width), height: String(height) });

  // Only matters when stretching: say how many pictures will actually distort.
  const target = width / height;
  const misshapen = shapes.filter((shape) => Math.abs(shape.width / shape.height - target) / target > 0.01).length;

  return (
    <fieldset>
      <legend className="label">Size</legend>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {MODES.map((mode) => {
          const selected = mode.resize === resize;
          return (
            <label
              key={mode.title}
              className={`relative flex cursor-pointer flex-col rounded-xl border px-3 py-2.5 transition duration-150 focus-within:ring-4 focus-within:ring-emerald-500/20 ${
                selected
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="batch-size-mode"
                checked={selected}
                onChange={() => onChange({ resize: mode.resize })}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-2">
                <span className={`text-sm font-semibold ${selected ? "text-emerald-800" : "text-slate-800"}`}>
                  {mode.title}
                </span>
                {selected && <CheckIcon className="h-4 w-4 text-emerald-600" />}
              </span>
              <span className="hint mt-0.5">{mode.hint}</span>
            </label>
          );
        })}
      </div>

      {resize && (
        <div className="animate-fade-up mt-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="batch-width" className="hint mb-1 block font-medium">
                Width (px)
              </label>
              <input
                id="batch-width"
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
            <span className="mb-2.5 text-slate-400" aria-hidden="true">
              ×
            </span>
            <div className="min-w-0 flex-1">
              <label htmlFor="batch-height" className="hint mb-1 block font-medium">
                Height (px)
              </label>
              <input
                id="batch-height"
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

          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={keepProportions}
              onChange={(event) => onChange({ keepProportions: event.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-emerald-600"
            />
            <span className="text-sm text-slate-700">
              <span className="font-medium text-slate-800">Keep proportions</span>
              <span className="hint block">
                {keepProportions
                  ? `Each image is scaled to fit inside ${width} × ${height}, so nothing is stretched or cropped. Images with a different shape come out narrower or shorter.`
                  : `Every image comes out at exactly ${width} × ${height}.`}
              </span>
            </span>
          </label>

          {!keepProportions && misshapen > 0 && (
            <p className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {misshapen === shapes.length
                ? `${misshapen === 1 ? "This image has" : `All ${misshapen} images have`} a different shape from ${width} × ${height} and will look stretched.`
                : `${misshapen} of ${shapes.length} images have a different shape from ${width} × ${height} and will look stretched.`}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
};

export default BatchSizeControls;
