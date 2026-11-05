import { useId, useState } from "react";
import { MAX_BATCH, parseUrls } from "../utils/sources";
import { LinkIcon, SpinnerIcon } from "./icons";

const PASTE_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘V" : "Ctrl+V";

/**
 * One box for one link or a hundred. The text is only cleared once the links
 * were accepted, so a link that failed to load is still there to fix.
 */
const UrlInput = ({ onSubmit, busy = false, label = "Or paste image links" }) => {
  const id = useId();
  const [text, setText] = useState("");
  const [problem, setProblem] = useState("");
  const { urls, invalid } = parseUrls(text);

  const submit = async () => {
    if (busy) return;
    if (!urls.length) {
      setProblem(
        text.trim()
          ? "That is not a web link. Image links start with https://"
          : "Paste an image link first."
      );
      return;
    }
    setProblem("");
    if (await onSubmit(urls)) setText("");
  };

  return (
    <div>
      <label htmlFor={id} className="label flex items-center gap-1.5">
        <LinkIcon className="h-4 w-4 text-slate-400" />
        {label}
      </label>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          id={id}
          rows={1}
          className="field min-h-[2.75rem] resize-y font-mono text-[13px] leading-5"
          placeholder="https://example.com/photo.jpg"
          value={text}
          spellCheck="false"
          autoComplete="off"
          aria-describedby={`${id}-hint`}
          aria-invalid={Boolean(problem)}
          onChange={(event) => {
            setText(event.target.value);
            setProblem("");
          }}
          onKeyDown={(event) => {
            // Enter loads, Shift+Enter starts a new line for the next link.
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            submit();
          }}
        />
        <button type="button" className="btn-outline shrink-0 py-2.5" onClick={submit} disabled={busy}>
          {busy ? (
            <>
              <SpinnerIcon className="h-4 w-4" />
              Loading…
            </>
          ) : urls.length > 1 ? (
            `Load ${Math.min(urls.length, MAX_BATCH)} links`
          ) : (
            "Load image"
          )}
        </button>
      </div>

      {problem ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs font-medium text-red-700" role="alert">
          {problem}
        </p>
      ) : (
        <p id={`${id}-hint`} className="hint mt-1.5">
          {urls.length > MAX_BATCH
            ? `That is ${urls.length} links. Only the first ${MAX_BATCH} will be added.`
            : invalid.length && urls.length
            ? invalid.length === 1
              ? "1 line is not a link and will be skipped."
              : `${invalid.length} lines are not links and will be skipped.`
            : `One link per line, up to ${MAX_BATCH}. You can also press ${PASTE_KEY} anywhere on the page to paste a copied image or link.`}
        </p>
      )}
    </div>
  );
};

export default UrlInput;
