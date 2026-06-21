/**
 * Downscale + compress an uploaded photo entirely on-device before storage.
 * Keeps each memory small (~tens of KB) so a lifetime of places fits comfortably.
 */
const MAX_EDGE = 900;
const JPEG_QUALITY = 0.82;

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type.includes("heic") || type.includes("heif")) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

export async function compressImage(file: File): Promise<Blob> {
  if (file.size === 0) {
    throw new Error("That file looks empty. Try choosing the photo again.");
  }
  if (isHeic(file)) {
    throw new Error(
      "HEIC photos aren't supported in most browsers. Export as JPEG or PNG, or on iPhone choose Settings → Camera → Formats → Most Compatible.",
    );
  }

  const bitmap = await loadBitmap(file);
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

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decode */
    }
  }
  const url = URL.createObjectURL(file);
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
