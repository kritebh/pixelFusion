import { useCallback, useRef, useState } from "react";
import { loadImage } from "../utils/convert";
import { convertItem, runPool, settingsKey } from "../utils/batch";
import { MAX_BATCH, fetchImageFile } from "../utils/sources";

// Links are fetched a few at a time so 100 of them neither queue forever nor
// hit one host with 100 requests at once. Local files only need their header
// read, which is cheap, so they get the same small pool.
const LOAD_LANES = 4;

const UNREADABLE =
  "This browser could not open it. The file may be damaged, or in a format it cannot read (such as HEIC).";

const friendly = (err, fallback) =>
  err?.message === "Could not read that image." ? UNREADABLE : err?.message || fallback;

let lastId = 0;
const newId = () => {
  lastId += 1;
  return `item-${lastId}`;
};

const blankItem = () => ({
  id: newId(),
  origin: "file",
  url: "",
  name: "",
  type: "",
  bytes: 0,
  objectUrl: "",
  width: 0,
  height: 0,
  // loading → ready | failed, and ready ↔ converting while a run is going.
  status: "loading",
  error: "",
  // { key, ...result } or { key, error } once converted. A key that differs
  // from the current settings means the result is out of date.
  outcome: null,
});

export const needsWork = (item, key) => item.status === "ready" && item.outcome?.key !== key;

const has = (list, id) => list.some((item) => item.id === id);
const roomIn = (list) => Math.max(0, MAX_BATCH - list.length);

/**
 * The bulk queue. Every change goes through `commit`, which keeps a ref in step
 * with state, so the async loaders and the conversion loop always see the
 * latest list instead of the one captured when they started.
 */
export default function useBatch() {
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const itemsRef = useRef([]);
  const runningRef = useRef(false);
  const stopRef = useRef(false);

  const commit = useCallback((change) => {
    itemsRef.current = change(itemsRef.current);
    setItems(itemsRef.current);
  }, []);

  const patch = useCallback(
    (id, values) => {
      if (!has(itemsRef.current, id)) return;
      commit((list) => list.map((item) => (item.id === id ? { ...item, ...values } : item)));
    },
    [commit]
  );

  const probe = useCallback(
    async (id, objectUrl) => {
      try {
        const image = await loadImage(objectUrl);
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) throw new Error("This image has no readable dimensions.");
        patch(id, { status: "ready", width, height });
      } catch (err) {
        patch(id, { status: "failed", error: friendly(err, UNREADABLE) });
      }
    },
    [patch]
  );

  const addFiles = useCallback(
    (files) => {
      const fresh = files.slice(0, roomIn(itemsRef.current)).map((file) => ({
        ...blankItem(),
        name: file.name,
        type: file.type,
        bytes: file.size,
        objectUrl: URL.createObjectURL(file),
      }));
      if (fresh.length) {
        commit((list) => [...list, ...fresh]);
        runPool(fresh, LOAD_LANES, (item) => probe(item.id, item.objectUrl));
      }
      return { added: fresh.length, leftOut: files.length - fresh.length };
    },
    [commit, probe]
  );

  const addUrls = useCallback(
    (urls) => {
      const fresh = urls.slice(0, roomIn(itemsRef.current)).map((url) => ({
        ...blankItem(),
        origin: "url",
        url,
        name: url,
      }));
      if (fresh.length) {
        commit((list) => [...list, ...fresh]);
        runPool(fresh, LOAD_LANES, async (item) => {
          let file;
          try {
            file = await fetchImageFile(item.url);
          } catch (err) {
            patch(item.id, { status: "failed", error: friendly(err, "That link could not be loaded.") });
            return;
          }
          // Removed while it was downloading: nothing left to show it in.
          if (!has(itemsRef.current, item.id)) return;
          const objectUrl = URL.createObjectURL(file);
          patch(item.id, { name: file.name, type: file.type, bytes: file.size, objectUrl });
          await probe(item.id, objectUrl);
        });
      }
      return { added: fresh.length, leftOut: urls.length - fresh.length };
    },
    [commit, patch, probe]
  );

  const remove = useCallback(
    (id) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (!item) return;
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      commit((list) => list.filter((entry) => entry.id !== id));
    },
    [commit]
  );

  const clear = useCallback(() => {
    stopRef.current = true;
    itemsRef.current.forEach((item) => item.objectUrl && URL.revokeObjectURL(item.objectUrl));
    commit(() => []);
  }, [commit]);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  /**
   * Converts, one file at a time, everything not already converted with these
   * exact settings. One at a time keeps memory flat (only one decoded picture
   * and one canvas exist at once) and lets the page repaint between files.
   */
  const convert = useCallback(
    async (settings) => {
      if (runningRef.current) return;
      const key = settingsKey(settings);
      const queue = itemsRef.current.filter((item) => needsWork(item, key)).map((item) => item.id);
      if (!queue.length) return;

      runningRef.current = true;
      stopRef.current = false;
      setRunning(true);
      setProgress({ done: 0, total: queue.length });

      try {
        for (let index = 0; index < queue.length; index += 1) {
          if (stopRef.current) break;
          const item = itemsRef.current.find((entry) => entry.id === queue[index]);
          if (!item) continue;

          patch(item.id, { status: "converting" });
          let outcome;
          try {
            outcome = { key, ...(await convertItem(item, settings)) };
          } catch (err) {
            outcome = { key, error: friendly(err, "This file could not be converted.") };
          }
          patch(item.id, { status: "ready", outcome });
          setProgress({ done: index + 1, total: queue.length });

          // Hand the main thread back for a frame so the list and progress bar
          // update between files instead of all at the end.
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } finally {
        runningRef.current = false;
        setRunning(false);
      }
    },
    [patch]
  );

  return { items, running, progress, addFiles, addUrls, remove, clear, stop, convert };
}
