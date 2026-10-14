import { isSupabaseSignedUploadUrl } from "./listing-files";

const COMPRESS_OVER = Math.floor(1.5 * 1024 * 1024);
const MAX_EDGE = 2400;
const JPEG_QUALITY = 0.85;

function isRaster(file: File) {
  return (
    /^image\/(jpeg|jpg|pjpeg|png|webp)$/i.test(file.type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name)
  );
}

/**
 * Shrink phone photos before they are uploaded. PDFs are left untouched so
 * licence scans stay as the partner sent them. Images that are already small
 * are left untouched so ID text is not recompressed.
 */
export async function compressListingImage(file: File): Promise<File> {
  const exotic = file.type.startsWith("image/") && !isRaster(file);
  if ((!exotic && file.size <= COMPRESS_OVER) || file.type === "application/pdf") return file;
  if (!file.type.startsWith("image/") && !exotic) return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), "image/jpeg", JPEG_QUALITY);
    });
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

/** PUT one file straight to Supabase Storage. The bytes never touch the Vercel function. */
export async function uploadSignedListingFile(signedUrl: string, file: File) {
  if (!isSupabaseSignedUploadUrl(signedUrl)) throw new Error("upload");
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "x-upsert": "true" },
    body,
  });
  if (!res.ok) throw new Error("upload");
}
