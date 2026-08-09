import { useEffect, useRef, useState } from "react";
import { renderBlob } from "../utils/convert";

// Above this many output pixels an automatic re-encode on every keystroke gets
// slow enough to feel broken, so we hand the user an explicit button instead of
// hanging the UI.
const AUTO_ENCODE_PIXEL_LIMIT = 24_000_000;

const IDLE = { status: "idle", blob: null, url: "", size: 0, error: "" };

/**
 * R3 — deliver the result before asking for the commitment. This encodes the
 * real output in the background so the screen can show the finished picture and
 * its exact byte size *before* the user commits to downloading, and so the
 * download itself reuses those bytes.
 */
export default function useOutputPreview({ image, width, height, formatId, quality }) {
  const [state, setState] = useState(IDLE);
  const [manualRuns, setManualRuns] = useState(0);
  const urlRef = useRef("");

  const pixels = Math.round(width || 0) * Math.round(height || 0);
  const tooLargeForAuto = pixels > AUTO_ENCODE_PIXEL_LIMIT;

  useEffect(() => {
    if (!image) {
      setState(IDLE);
      return undefined;
    }
    if (tooLargeForAuto && manualRuns === 0) {
      setState({ ...IDLE, status: "deferred" });
      return undefined;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: "working", error: "" }));

    const timer = setTimeout(async () => {
      try {
        const blob = await renderBlob({ image, width, height, formatId, quality });
        if (cancelled) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        setState({
          status: "ready",
          blob,
          url: urlRef.current,
          size: blob.size,
          error: "",
        });
      } catch (err) {
        if (cancelled) return;
        setState({ ...IDLE, status: "error", error: err.message });
      }
    }, 260);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [image, width, height, formatId, quality, tooLargeForAuto, manualRuns]);

  // Reset the manual opt-in whenever a different image is loaded.
  useEffect(() => {
    setManualRuns(0);
  }, [image]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  return { ...state, run: () => setManualRuns((n) => n + 1) };
}
