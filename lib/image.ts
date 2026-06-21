/**
 * Downscale + compress an uploaded photo entirely on-device before storage.
 * Keeps each memory small (~tens of KB) so a lifetime of places fits comfortably.
 */
const MAX_EDGE = 900;
const JPEG_QUALITY = 0.82;
const HEIC_JPEG_QUALITY = 0.9;

/** Detect HEIC/HEIF by MIME and extension — iPhone files often omit `file.type`. */
export function isHeicFile(file: File): boolean {
  const type = file.type;
  if (/^image\/heic$/i.test(type) || /^image\/heif$/i.test(type)) return true;
  if (/heic|heif/i.test(type)) return true;
  return /\.heic$|\.heif$/i.test(file.name);
}

/** True for normal image MIME types and HEIC picked without a reliable type. */
export function isPhotoFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return isHeicFile(file);
}

/** Convert HEIC/HEIF to JPEG on-device; pass through everything else unchanged. */
export async function convertHeicIfNeeded(file: File): Promise<File | Blob> {
  if (!isHeicFile(file)) return file;

  try {
    const { heicTo } = await import("heic-to");
    return await heicTo({
      blob: file,
      type: "image/jpeg",
      quality: HEIC_JPEG_QUALITY,
    });
  } catch {
    throw new Error(
      "Не вдалося конвертувати це HEIC-фото. Спробуй експортувати його як JPEG (Перегляд → File → Export).",
    );
  }
}

export async function compressImage(file: File): Promise<Blob> {
  if (file.size === 0) {
    throw new Error("That file looks empty. Try choosing the photo again.");
  }

  const input = await convertHeicIfNeeded(file);
  const bitmap = await loadBitmap(input);
  const { width, height } = bitmap;

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);

  // Release decoded bitmap memory early when supported.
  if ("close" in bitmap) (bitmap as ImageBitmap).close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) {
    throw new Error(
      "Couldn't save that image after resizing. Try a JPEG or PNG instead.",
    );
  }
  return blob;
}

async function loadBitmap(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(source);
    } catch {
      /* fall through to <img> decode */
    }
  }
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error(
      "This browser can't read that image format. Use a JPEG or PNG photo.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
