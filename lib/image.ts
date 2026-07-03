/**
 * Downscale + compress an uploaded photo entirely on-device before storage.
 * Keeps each memory small (~tens of KB) so a lifetime of places fits comfortably.
 */
const MAX_EDGE = 900;
const JPEG_QUALITY = 0.82;

const HEIC_TIMEOUT_MS = 60_000;
const HEIC_TIMEOUT_MSG =
  "This photo took too long to convert — try a smaller image or export as JPEG from Photos.";
const HEIC_CONVERT_MSG =
  "Couldn't convert this iPhone photo. Try choosing a JPEG from the gallery, or export the photo as JPEG in Photos.";

/** Reject camera originals before decode — tune if real-world uploads hit this often. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

export function maxUploadSizeError(): string {
  return `That photo's too large — try one under ${MAX_UPLOAD_MB} MB.`;
}

function assertUploadSize(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(maxUploadSizeError());
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Detect HEIC/HEIF by MIME and extension — iPhone files often omit `file.type`. */
export function isHeicFile(file: File): boolean {
  const type = file.type;
  if (/^image\/heic$/i.test(type) || /^image\/heif$/i.test(type)) return true;
  if (/heic|heif/i.test(type)) return true;
  return /\.heic$|\.heif$/i.test(file.name);
}

/** True for normal image MIME types, HEIC, and gallery picks with missing type. */
export function isPhotoFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (isHeicFile(file)) return true;
  // iOS/Android gallery picks sometimes omit MIME type.
  if (!file.type && file.size > 0) return true;
  return false;
}

/** Read ISO-BMFF ftyp brand — works when iOS omits filename/type. */
async function isHeicBlob(blob: Blob): Promise<boolean> {
  if (blob instanceof File && isHeicFile(blob)) return true;
  if (blob.size < 12) return false;
  const buf = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const ftyp = String.fromCharCode(buf[4], buf[5], buf[6], buf[7]);
  if (ftyp !== "ftyp") return false;
  const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
  return /heic|heif|mif1|msf1|heix|hevc|hevx/i.test(brand);
}

/** HEIC → resized ImageBitmap via heic-to worker + createImageBitmap resize options. */
async function convertHeicToBitmap(file: File): Promise<ImageBitmap> {
  try {
    const { heicTo } = await import("heic-to");
    return await withTimeout(
      heicTo({
        blob: file,
        type: "bitmap",
        options: {
          resizeWidth: MAX_EDGE,
          resizeHeight: MAX_EDGE,
          resizeQuality: "high",
        },
      }),
      HEIC_TIMEOUT_MS,
      HEIC_TIMEOUT_MSG,
    );
  } catch (err) {
    if (err instanceof Error && err.message === HEIC_TIMEOUT_MSG) throw err;
    throw new Error(HEIC_CONVERT_MSG);
  }
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
      "This browser can't read that image format. Try a JPEG or PNG photo.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function compressBitmap(bitmap: ImageBitmap | HTMLImageElement): Promise<Blob> {
  const width = "width" in bitmap ? bitmap.width : (bitmap as HTMLImageElement).naturalWidth;
  const height = "height" in bitmap ? bitmap.height : (bitmap as HTMLImageElement).naturalHeight;

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

export async function compressImage(file: File): Promise<Blob> {
  if (file.size === 0) {
    throw new Error("That file looks empty. Try choosing the photo again.");
  }
  assertUploadSize(file);

  if (await isHeicBlob(file)) {
    const bitmap = await convertHeicToBitmap(file);
    return await compressBitmap(bitmap);
  }

  // Most gallery picks (JPEG/PNG, including iOS downscaled exports) decode directly.
  try {
    return await compressBitmap(await loadBitmap(file));
  } catch {
    throw new Error(
      "Couldn't read that photo. Try choosing a JPEG or PNG from your gallery.",
    );
  }
}
