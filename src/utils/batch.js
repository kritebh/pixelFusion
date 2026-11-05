import { MAX_DIMENSION, loadImage, renderBlob } from "./convert";
import { getFormat, getFormats, safeStem } from "./formats";
import { normaliseMime } from "./sources";

export const ORIGINAL = "original";

/**
 * A pseudo-format for the picker: every file keeps the format it came in, so
 * a batch can be re-compressed or resized without changing type.
 */
export const ORIGINAL_OPTION = {
  id: ORIGINAL,
  label: "Keep original",
  hint: "Same as each file",
  available: true,
  alpha: true,
  quality: true,
  blurb:
    "Each file stays in its own format. Formats this browser cannot write, such as BMP or SVG, are saved as PNG instead. Quality only affects the JPEG and WebP files.",
};

export const DEFAULT_BATCH_SIZE = { width: 1920, height: 1080 };

/** Runs `worker` over `items` with at most `limit` running at once. */
export const runPool = async (items, limit, worker) => {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
};

/**
 * One string that changes whenever a setting that affects the output changes.
 * A result made under a different key is out of date. Quality only counts when
 * the output format actually uses it, so moving the slider while PNG is picked
 * does not throw finished work away.
 */
export const settingsKey = ({ formatId, quality, resize, width, height, keepProportions }) => {
  const usesQuality = formatId === ORIGINAL || getFormat(formatId)?.quality;
  const size = resize ? `${width}x${height}${keepProportions ? "fit" : "exact"}` : "same";
  return [formatId, usesQuality ? Math.round(quality * 100) : "-", size].join("|");
};

export const targetSize = (source, { resize, width, height, keepProportions }) => {
  let w = source.width;
  let h = source.height;

  if (resize && keepProportions) {
    const scale = Math.min(width / w, height / h);
    w *= scale;
    h *= scale;
  } else if (resize) {
    w = width;
    h = height;
  }

  // The canvas tops out at MAX_DIMENSION per side. Scaling both sides together
  // keeps the picture from being squashed when one side is over the limit.
  const over = Math.max(w, h) / MAX_DIMENSION;
  if (over > 1) {
    w /= over;
    h /= over;
  }
  return {
    width: Math.max(1, Math.round(w)),
    height: Math.max(1, Math.round(h)),
    capped: over > 1,
  };
};

const typeLabel = (mime) =>
  mime === "image/svg+xml" ? "SVG" : (mime.split("/")[1] || "this format").toUpperCase();

/** The format a file is saved in, and a note when that differs from what was asked. */
export const resolveFormat = (formatId, sourceType) => {
  if (formatId !== ORIGINAL) return { format: getFormat(formatId), note: "" };

  const type = normaliseMime(sourceType);
  const same = getFormats().find((f) => f.mime === type && f.available && !f.synthetic);
  if (same) return { format: same, note: "" };

  return {
    format: getFormat("png"),
    note:
      type === "image/svg+xml"
        ? "Saved as PNG. The converter works in pixels, so the SVG's vector shapes cannot be kept."
        : `Saved as PNG, because this browser cannot write ${typeLabel(type)} files.`,
  };
};

export const convertItem = async (item, settings) => {
  const image = await loadImage(item.objectUrl);
  const { format, note } = resolveFormat(settings.formatId, item.type);
  const { width, height, capped } = targetSize(item, settings);
  const blob = await renderBlob({
    image,
    width,
    height,
    formatId: format.id,
    quality: settings.quality,
  });

  const notes = [note];
  if (capped) notes.push(`Scaled to ${width} × ${height} to stay within the ${MAX_DIMENSION} px limit.`);

  return {
    blob,
    size: blob.size,
    width,
    height,
    formatId: format.id,
    formatLabel: format.label,
    ext: format.ext,
    note: notes.filter(Boolean).join(" "),
  };
};

export const stemOf = (name) => safeStem(name.replace(/\.[^./\\]+$/, ""), "image");

/**
 * Gives every output a unique name: photo.webp, photo-1.webp, photo-2.webp.
 * Compared without case, because macOS and Windows treat Photo.webp and
 * photo.webp as the same file and one would overwrite the other on unzip.
 */
export const assignFilenames = (entries) => {
  const used = new Set();
  const names = new Map();
  for (const { id, stem, ext } of entries) {
    let candidate = `${stem}.${ext}`;
    for (let n = 1; used.has(candidate.toLowerCase()); n += 1) candidate = `${stem}-${n}.${ext}`;
    used.add(candidate.toLowerCase());
    names.set(id, candidate);
  }
  return names;
};

/**
 * Images are already compressed, so the ZIP only stores them. client-zip does
 * exactly that in 2.6 kB, and it is loaded only when someone saves a batch.
 */
export const buildZip = async (entries) => {
  const { downloadZip } = await import("client-zip");
  const lastModified = new Date();
  return downloadZip(entries.map(({ name, blob }) => ({ name, input: blob, lastModified }))).blob();
};
