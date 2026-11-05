// Getting images into the page: picked files, dropped files and folders,
// pasted images, and links.
//
// A link is fetched by this browser straight from the site that hosts it.
// There is no server of ours in between, which keeps the "nothing is uploaded"
// promise true, and is also why a site that forbids other pages from reading
// its images (CORS) cannot be loaded. The error says so plainly.

import { safeStem } from "./formats";

export const MAX_BATCH = 100;

const FETCH_TIMEOUT_MS = 30_000;

const MIME_BY_EXT = new Map([
  ["png", "image/png"],
  ["apng", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["jfif", "image/jpeg"],
  ["pjpeg", "image/jpeg"],
  ["pjp", "image/jpeg"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
  ["bmp", "image/bmp"],
  ["svg", "image/svg+xml"],
  ["avif", "image/avif"],
  ["ico", "image/x-icon"],
  ["tif", "image/tiff"],
  ["tiff", "image/tiff"],
  ["heic", "image/heic"],
  ["heif", "image/heif"],
]);

const EXT_BY_MIME = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/bmp", "bmp"],
  ["image/svg+xml", "svg"],
  ["image/avif", "avif"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
  ["image/tiff", "tiff"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
]);

const MIME_ALIASES = new Map([
  ["image/jpg", "image/jpeg"],
  ["image/pjpeg", "image/jpeg"],
  ["image/x-png", "image/png"],
  ["image/apng", "image/png"],
]);

const EMPTY = { files: [], total: 0, skipped: 0, urls: [], error: "" };

const extensionOf = (name = "") => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";

// Dot-files and dot-folders (.DS_Store, ._photo.jpg resource forks, .git) are
// never pictures the user meant to convert, even when the extension says so.
const isHiddenPath = (path = "") => path.split("/").some((part) => part.startsWith("."));

const looksLikeImage = (name) => !isHiddenPath(name) && MIME_BY_EXT.has(extensionOf(name));

/** Ref callback: React has no prop for webkitdirectory, so it is set directly. */
export const asFolderPicker = (node) => {
  if (node) node.webkitdirectory = true;
};

export const normaliseMime = (mime = "") => {
  const clean = mime.split(";")[0].trim().toLowerCase();
  return MIME_ALIASES.get(clean) ?? clean;
};

/**
 * Returns the file with a trustworthy image MIME type, or null if it is not an
 * image. Some systems hand over images with an empty type; an SVG with no type
 * will not render from a blob URL, so the type is filled in from the extension.
 */
export const asImageFile = (file) => {
  if (!file || isHiddenPath(file.name)) return null;
  const type = normaliseMime(file.type);
  const resolved = type.startsWith("image/") ? type : MIME_BY_EXT.get(extensionOf(file.name));
  if (!resolved) return null;
  return resolved === file.type
    ? file
    : new File([file], file.name, { type: resolved, lastModified: file.lastModified });
};

const settle = (images, { skipped = 0, beyondCap = 0 } = {}) => ({
  ...EMPTY,
  files: images.slice(0, MAX_BATCH),
  total: images.length + beyondCap,
  skipped,
});

const byPath = (a, b) =>
  (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, {
    numeric: true,
  });

/** Files from an <input type="file">, including a folder picked with webkitdirectory. */
export const collectPicked = async (list) => {
  const all = Array.from(list ?? []);
  if (all.some((file) => file.webkitRelativePath)) all.sort(byPath);
  const visible = all.filter((file) => !isHiddenPath(file.webkitRelativePath || file.name));
  const images = visible.map(asImageFile).filter(Boolean);
  return settle(images, { skipped: visible.length - images.length });
};

const readBatch = (reader) =>
  new Promise((resolve, reject) => reader.readEntries(resolve, reject));

const fileOf = (entry) => new Promise((resolve, reject) => entry.file(resolve, reject));

const walk = async (entry, out) => {
  if (entry.name.startsWith(".")) return;
  if (entry.isFile) {
    out.push(entry);
    return;
  }
  if (!entry.isDirectory) return;

  // readEntries hands back at most ~100 entries per call, so keep asking until
  // it returns an empty batch.
  const reader = entry.createReader();
  const children = [];
  for (let batch = await readBatch(reader); batch.length; batch = await readBatch(reader)) {
    children.push(...batch);
  }
  children.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  for (const child of children) await walk(child, out);
};

const gather = async (loose, folders, links) => {
  if (links.length) return { ...EMPTY, urls: links };

  const visible = loose.filter((file) => !isHiddenPath(file.name));
  const looseImages = visible.map(asImageFile).filter(Boolean);
  let skipped = visible.length - looseImages.length;

  const nested = [];
  try {
    for (const folder of folders) await walk(folder, nested);
  } catch (_) {
    return { ...EMPTY, error: "That folder could not be read. Try the “Choose a folder” button instead." };
  }

  // Filter by name first so only the files that can actually join the batch
  // are opened, even when the folder holds thousands.
  const nestedImages = nested.filter((entry) => looksLikeImage(entry.name));
  skipped += nested.length - nestedImages.length;

  const room = Math.max(0, MAX_BATCH - looseImages.length);
  const picked = nestedImages.slice(0, room);
  const read = await Promise.all(picked.map((entry) => fileOf(entry).then(asImageFile, () => null)));

  return settle([...looseImages, ...read.filter(Boolean)], {
    skipped,
    beyondCap: nestedImages.length - picked.length,
  });
};

/**
 * Files, folders or links from a drop. Everything is read synchronously first:
 * the browser empties the DataTransfer as soon as the drop event returns.
 */
export const collectDropped = (dataTransfer) => {
  if (!dataTransfer) return Promise.resolve({ ...EMPTY });

  const loose = [];
  const folders = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      folders.push(entry);
      continue;
    }
    const file = item.getAsFile();
    if (file) loose.push(file);
  }
  if (!loose.length && !folders.length) loose.push(...Array.from(dataTransfer.files ?? []));

  // An image dragged from another tab often arrives as a link, not a file.
  const links =
    loose.length || folders.length
      ? []
      : parseUrls(dataTransfer.getData("text/uri-list") || dataTransfer.getData("text/plain") || "")
          .urls;

  return gather(loose, folders, links);
};

// "www.site.com/photo.jpg" without a scheme still counts. A bare "photo.jpg"
// does not, because that is far more likely a file name than a website.
const BARE_DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+\//i;

const toWebUrl = (token) => {
  const candidate = BARE_DOMAIN.test(token) ? `https://${token}` : token;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch (_) {
    return "";
  }
};

/** Splits pasted text into unique web links, and the bits that are not links. */
export const parseUrls = (text = "") => {
  const urls = [];
  const invalid = [];
  const seen = new Set();
  for (const token of text.split(/\s+/)) {
    if (!token) continue;
    const url = toWebUrl(token);
    if (!url) invalid.push(token);
    else if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return { urls, invalid };
};

export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (_) {
    return "that site";
  }
};

/**
 * The extension follows what the site actually sent, not what the link says,
 * so a ".jpg" link that serves WebP is named ".webp".
 */
export const nameFromUrl = (url, type) => {
  let last = "";
  try {
    last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() ?? "");
  } catch (_) {
    last = "";
  }
  const stem = safeStem(last.replace(/\.[^.]+$/, ""), "image").slice(0, 100);
  const ext = EXT_BY_MIME.get(type) ?? (type.split("/")[1] || "img").replace(/[^a-z0-9]/gi, "");
  return `${stem}.${ext}`;
};

const sniffImageType = async (blob) => {
  const bytes = new Uint8Array(await blob.slice(0, 512).arrayBuffer());
  const ascii = (start, end) => String.fromCharCode(...bytes.subarray(start, end));

  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(8, 12))) return "image/avif";
  if (ascii(0, 2) === "BM") return "image/bmp";
  if (/<svg[\s>]/i.test(new TextDecoder().decode(bytes))) return "image/svg+xml";
  return "";
};

// An https page is not allowed to fetch plain http, so try the secure
// address instead of failing outright. Most image hosts serve both.
const preferHttps = (url) =>
  typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http:")
    ? `https:${url.slice(5)}`
    : url;

/** Downloads an image link in the browser and hands it back as a File. */
export const fetchImageFile = async (rawUrl) => {
  const url = preferHttps(rawUrl);
  const host = hostOf(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let response;
    try {
      response = await fetch(url, {
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) throw err;
      // The browser reports a CORS refusal and an unreachable host the same
      // way, so the message has to cover both.
      throw new Error(
        `${host} does not let other websites read its images, or the link is down. Save the image to your device and drop it here instead.`
      );
    }

    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? `There is no image at that link (${host} says 404).`
          : `${host} refused the request (error ${response.status}).`
      );
    }

    const declared = normaliseMime(response.headers.get("content-type") ?? "");
    if (declared === "text/html") {
      throw new Error(
        "That link opens a web page, not an image. Right-click the picture, copy its image address, and paste that instead."
      );
    }

    const blob = await response.blob();
    const type = declared.startsWith("image/") ? declared : await sniffImageType(blob);
    if (!type) throw new Error(`${host} did not send back an image.`);

    return new File([blob], nameFromUrl(rawUrl, type), { type });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`${host} took longer than ${FETCH_TIMEOUT_MS / 1000} seconds to send the image.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};
