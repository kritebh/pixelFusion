// Format registry + honest capability probing.
//
// Browsers silently fall back to PNG when asked to encode a format they do not
// support (Chrome returns a PNG data URL for `image/gif`). Shipping that would
// hand the user a file named `.gif` that is really a PNG, so every raster
// format is probed once at runtime and unsupported ones are surfaced as
// unavailable instead of quietly lying.

const probeCache = new Map();

const canEncode = (mime) => {
  if (probeCache.has(mime)) return probeCache.get(mime);
  let supported = false;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    supported = canvas.toDataURL(mime).startsWith(`data:${mime}`);
  } catch (_) {
    supported = false;
  }
  probeCache.set(mime, supported);
  return supported;
};

const FORMATS = [
  {
    id: "webp",
    label: "WebP",
    ext: "webp",
    mime: "image/webp",
    alpha: true,
    quality: true,
    blurb: "Usually the smallest file that still keeps transparency.",
  },
  {
    id: "png",
    label: "PNG",
    ext: "png",
    mime: "image/png",
    alpha: true,
    quality: false,
    blurb: "Lossless. Best for screenshots, logos and flat graphics.",
  },
  {
    id: "jpeg",
    label: "JPEG",
    ext: "jpg",
    mime: "image/jpeg",
    alpha: false,
    quality: true,
    blurb: "Small files for photos. No transparency.",
  },
  {
    id: "gif",
    label: "GIF",
    ext: "gif",
    mime: "image/gif",
    alpha: true,
    quality: false,
    blurb: "Single frame, 256 colours.",
  },
  {
    id: "svg",
    label: "SVG",
    ext: "svg",
    mime: "image/svg+xml",
    alpha: true,
    quality: false,
    synthetic: true,
    blurb: "Wraps the pixels in an SVG shell. Stays a raster picture.",
  },
];

/**
 * The format list with a truthful `available` flag for this browser.
 * `synthetic` formats are assembled by hand, so they never need a probe.
 */
export const getFormats = () =>
  FORMATS.map((format) => ({
    ...format,
    available: format.synthetic ? true : canEncode(format.mime),
  }));

export const getFormat = (id) => FORMATS.find((format) => format.id === id);

/**
 * R1 — the output format is a recommendation, never a blank choice.
 * The reason has to hold up, so it is derived from a fact we actually know:
 * JPEG sources have no alpha channel, anything else might.
 */
export const recommendFormat = (sourceMime, formats) => {
  const usable = formats.filter((format) => format.available);
  const pick = (id) => usable.find((format) => format.id === id);

  if (sourceMime === "image/webp" && pick("png")) {
    return { id: "png", reason: "your file is already WebP, and PNG re-encodes it without further loss." };
  }
  if (sourceMime === "image/jpeg" && pick("webp")) {
    return { id: "webp", reason: "photos re-encode smaller as WebP, and a JPEG has no transparency to lose." };
  }
  if (pick("webp")) {
    return { id: "webp", reason: "it is smaller than PNG in most cases and keeps any transparency." };
  }
  return { id: usable[0]?.id, reason: "" };
};

export const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};

/** Sanitises a user-typed file stem without silently emptying it. */
export const safeStem = (stem, fallback = "image") => {
  const cleaned = stem.replace(/[\\/:*?"<>|]/g, "").trim();
  return cleaned || fallback;
};
