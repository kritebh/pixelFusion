import { getFormat } from "./formats";

export const MAX_DIMENSION = 8192;

export const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = src;
  });

const clampDimension = (value) =>
  Math.max(1, Math.min(MAX_DIMENSION, Math.round(Number(value) || 1)));

const drawToCanvas = (image, width, height, format) => {
  const canvas = document.createElement("canvas");
  canvas.width = clampDimension(width);
  canvas.height = clampDimension(height);

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // JPEG has no alpha channel. Without this fill, transparent pixels encode as
  // black — so the "transparent areas become white" warning in the UI would be
  // a false claim.
  if (!format.alpha) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const toSvgBlob = (canvas) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("width", canvas.width);
  svg.setAttribute("height", canvas.height);
  svg.setAttribute("viewBox", `0 0 ${canvas.width} ${canvas.height}`);

  const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", canvas.width);
  image.setAttribute("height", canvas.height);
  image.setAttribute("href", canvas.toDataURL("image/png"));

  svg.appendChild(image);

  const markup = new XMLSerializer().serializeToString(svg);
  return new Blob([markup], { type: "image/svg+xml" });
};

const canvasToBlob = (canvas, mime, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("This browser could not encode that format."))),
      mime,
      quality
    );
  });

/**
 * Encodes the image and hands back the real Blob, so the UI can report the
 * exact output size rather than an estimate — and so the download reuses the
 * bytes we already produced instead of encoding twice.
 */
export const renderBlob = async ({ image, width, height, formatId, quality }) => {
  const format = getFormat(formatId);
  if (!format) throw new Error("Unknown output format.");

  const canvas = drawToCanvas(image, width, height, format);

  try {
    if (format.synthetic) return toSvgBlob(canvas);

    const blob = await canvasToBlob(
      canvas,
      format.mime,
      format.quality ? quality : undefined
    );

    // A browser that cannot encode the requested type silently returns a PNG.
    // Refuse to pass that off as the format the user asked for.
    if (blob.type !== format.mime) {
      throw new Error(`This browser cannot encode ${format.label}.`);
    }
    return blob;
  } finally {
    // A batch encodes one canvas per file. Shrinking it to nothing returns its
    // pixel memory now instead of whenever garbage collection runs, which keeps
    // Safari under its total canvas-memory cap on long runs.
    canvas.width = 0;
    canvas.height = 0;
  }
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
