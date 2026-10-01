import { compressImageToWebP } from './compressImage';

/** Same limits the backend enforces for installment plan documents. */
export const MAX_DOCUMENT_IMAGES = 5;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/**
 * Prepare document photos for upload: images only, max 5 MB each (checked on
 * the ORIGINAL file), then shrunk in the browser to WebP ≤ ~500 KB / 2000 px so
 * a phone photo uploads fast. The server compresses again (WebP/AVIF, ≤ 500 KB)
 * so the stored size is guaranteed even if the browser step is skipped.
 * Formats the browser cannot decode (e.g. HEIC on Chrome) are sent as-is.
 */
export async function prepareDocumentImages(
  files: File[],
  alreadyAttached = 0,
): Promise<{ files: File[]; errors: string[] }> {
  const errors: string[] = [];
  const room = Math.max(0, MAX_DOCUMENT_IMAGES - alreadyAttached);
  if (files.length > room) {
    errors.push(`Only ${room} more image${room === 1 ? '' : 's'} can be added (max ${MAX_DOCUMENT_IMAGES}).`);
  }
  const accepted: File[] = [];
  for (const f of files.slice(0, room)) {
    if (!/^image\//i.test(f.type)) {
      errors.push(`${f.name}: not an image`);
      continue;
    }
    if (f.size > MAX_DOCUMENT_BYTES) {
      errors.push(`${f.name}: larger than 5 MB`);
      continue;
    }
    try {
      accepted.push(await compressImageToWebP(f, { maxDim: 2000, maxBytes: 500 * 1024 }));
    } catch {
      accepted.push(f); // the server will compress it
    }
  }
  return { files: accepted, errors };
}

export const formatKB = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
