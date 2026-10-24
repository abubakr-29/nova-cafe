// Turns a photo from a phone or camera into the two small pictures we store.
//
// Phone photos are 3000-4000px and several MB. We centre-crop to a square and
// shrink in the browser, so a photo uploads in a second and costs ~100 KB.

export const FULL_SIZE = 800;
export const THUMB_SIZE = 240;
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export type PreparedPhoto = {
  full: Blob;
  thumb: Blob;
  ext: "webp" | "jpg";
  contentType: string;
};

/** The biggest centred square inside a width x height picture. */
export function squareCropRect(width: number, height: number) {
  const side = Math.min(width, height);

  return {
    sx: Math.round((width - side) / 2),
    sy: Math.round((height - side) / 2),
    side,
  };
}

/** Never enlarge a small picture just to reach the target size. */
export function targetSize(side: number, max: number) {
  return Math.min(side, max);
}

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

async function decode(file: File): Promise<Decoded> {
  // createImageBitmap applies the phone's rotation (EXIF) for us.
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  // Older browsers: fall back to an <img> element.
  const url = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });

    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

async function render(decoded: Decoded, size: number) {
  const { sx, sy, side } = squareCropRect(decoded.width, decoded.height);
  const target = targetSize(side, size);

  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");

  context.imageSmoothingQuality = "high";
  context.drawImage(decoded.source, sx, sy, side, side, 0, 0, target, target);

  return canvas;
}

export async function prepareMenuPhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file isn't a picture. Please choose a photo.");
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(
      "That photo is too large (over 25 MB). Please choose a smaller one.",
    );
  }

  let decoded: Decoded;

  try {
    decoded = await decode(file);
  } catch {
    throw new Error("We couldn't read that picture. Try a JPG or PNG photo.");
  }

  try {
    const fullCanvas = await render(decoded, FULL_SIZE);
    const thumbCanvas = await render(decoded, THUMB_SIZE);

    // WebP is ~30% smaller; very old browsers silently return PNG, so fall back to JPEG.
    let ext: "webp" | "jpg" = "webp";
    let contentType = "image/webp";
    let full = await toBlob(fullCanvas, contentType, 0.82);

    if (!full || full.type !== "image/webp") {
      ext = "jpg";
      contentType = "image/jpeg";
      full = await toBlob(fullCanvas, contentType, 0.85);
    }

    const thumb = await toBlob(
      thumbCanvas,
      contentType,
      ext === "webp" ? 0.8 : 0.82,
    );

    if (!full || !thumb) throw new Error("encode");

    return { full, thumb, ext, contentType };
  } catch {
    throw new Error("We couldn't prepare that photo. Please try another one.");
  } finally {
    decoded.close?.();
  }
}
