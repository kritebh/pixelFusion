import { getFormat } from "../utils/formats";
import { CheckIcon } from "./icons";

/**
 * R1 — one option arrives pre-selected and labelled as a recommendation, and
 * the list is capped well under the point where choosing becomes work.
 * Formats this browser cannot actually encode are shown as unavailable rather
 * than handed over as a mislabelled PNG.
 */
const FormatPicker = ({
  formats,
  value,
  onChange,
  recommendedId,
  quality,
  onQualityChange,
  alphaWarning,
}) => {
  const selected = getFormat(value);

  return (
    <fieldset>
      <legend className="label">Convert to</legend>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {formats.map((format) => {
          const isSelected = format.id === value;
          const isRecommended = format.id === recommendedId;

          return (
            <label
              key={format.id}
              className={`relative flex cursor-pointer flex-col rounded-xl border px-3 py-2.5 transition duration-150 focus-within:ring-4 focus-within:ring-emerald-500/20 ${
                !format.available
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  : isSelected
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="output-format"
                value={format.id}
                checked={isSelected}
                disabled={!format.available}
                onChange={() => onChange(format.id)}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${
                    isSelected ? "text-emerald-800" : "text-slate-800"
                  }`}
                >
                  {format.label}
                </span>
                {isSelected && <CheckIcon className="h-4 w-4 text-emerald-600" />}
              </span>
              <span className="hint mt-0.5">
                {format.available
                  ? isRecommended
                    ? "Recommended"
                    : `.${format.ext}`
                  : "Not supported here"}
              </span>
            </label>
          );
        })}
      </div>

      {selected && <p className="hint mt-2.5">{selected.blurb}</p>}

      {alphaWarning && (
        <p className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {selected?.label} has no transparency channel — any transparent areas
          will be filled with white.
        </p>
      )}

      {selected?.quality && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="quality" className="label">
              Quality
            </label>
            <span className="text-sm font-semibold tabular-nums text-slate-700">
              {Math.round(quality * 100)}%
            </span>
          </div>
          <input
            id="quality"
            type="range"
            min="30"
            max="100"
            step="5"
            value={Math.round(quality * 100)}
            onChange={(event) => onQualityChange(Number(event.target.value) / 100)}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600"
          />
        </div>
      )}
    </fieldset>
  );
};

export default FormatPicker;
