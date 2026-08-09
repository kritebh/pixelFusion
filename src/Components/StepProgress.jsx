import { CheckIcon } from "./icons";

/**
 * R2 — the flow never starts at zero.
 *
 * The first step is genuinely complete the moment the page renders: the
 * converter is loaded and runs locally, so there is nothing left to wait for.
 * Crediting that is a real head start, not a padded bar — every other segment
 * only fills once the user has actually done the thing it names.
 */
const StepProgress = ({ steps }) => {
  const doneCount = steps.filter((step) => step.done).length;
  const pendingIndex = steps.findIndex((step) => !step.done);
  const currentIndex = pendingIndex === -1 ? steps.length - 1 : pendingIndex;
  const current = steps[currentIndex];
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <section aria-label="Progress" className="w-full">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-slate-800">
          Step {currentIndex + 1} of {steps.length}
          <span className="font-normal text-slate-500"> · {current.headline}</span>
        </p>
        <p className="text-xs font-medium tabular-nums text-emerald-700">{percent}% done</p>
      </div>

      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Step ${currentIndex + 1} of ${steps.length}: ${current.headline}`}
      >
        {steps.map((step, index) => (
          <span
            key={step.id}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              step.done
                ? "bg-emerald-500"
                : index === currentIndex
                ? "bg-emerald-500/30"
                : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`inline-flex items-center gap-1.5 text-xs ${
              step.done
                ? "text-emerald-700"
                : index === currentIndex
                ? "font-semibold text-slate-800"
                : "text-slate-400"
            }`}
          >
            {step.done ? (
              <CheckIcon className="h-3.5 w-3.5" />
            ) : (
              <span
                className={`h-3.5 w-3.5 rounded-full border-2 ${
                  index === currentIndex ? "border-emerald-500" : "border-slate-300"
                }`}
              />
            )}
            {step.label}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default StepProgress;
