/**
 * Client-side image compression using the Canvas API.
 *
 * Strategy:
 *  1. Load the file as an <img> element.
 *  2. Draw onto a canvas, capping maximum dimension at MAX_DIM px.
 *  3. Export as WebP (universally supported in modern browsers).
 *  4. If the result is still over MAX_BYTES, retry at progressively lower
 *     quality until it fits or quality floor (0.30) is reached.
 *
 * The returned File preserves the original base-name with a `.webp` extension
 * so the server can handle it without further magic.
 */

const MAX_DIM = 1920;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const INITIAL_QUALITY = 0.85;
const QUALITY_STEP = 0.08;
const QUALITY_FLOOR = 0.30;

/**
 * Compress a single image File to WebP.
 * Files already ≤ 2 MB are still converted to WebP for format consistency
 * (ImageKit then serves them as the optimal format per device via URL transforms).
 *
 * @param file - The original image File object.
 * @returns A new File with type "image/webp".
 */
export async function compressImageToWebP(file: File): Promise<File> {
  // Decode to ImageBitmap (respects EXIF orientation automatically in most browsers)
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Fallback: decode via <img> element (e.g. older Safari)
    bitmap = await loadImageBitmap(file);
  }

  let { width, height } = bitmap;

  // Scale down if larger than MAX_DIM on either axis
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // If the source is already small, skip the iterative quality loop
  const needsCompression = file.size > MAX_BYTES;
  const startQuality = needsCompression ? INITIAL_QUALITY : 0.92;

  const blob = await toWebPBlob(canvas, startQuality, needsCompression ? MAX_BYTES : Infinity);

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
}

/**
 * Compress an array of File objects, enforcing a max of 5 total.
 * Throws if more than 5 files are passed.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  if (files.length > 5) {
    throw new Error('Maximum 5 images allowed');
  }
  return Promise.all(files.map(compressImageToWebP));
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function toWebPBlob(canvas: HTMLCanvasElement, quality: number, maxBytes: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const attempt = (q: number) => {
      canvas.toBlob(
        blob => {
          if (!blob) return reject(new Error('canvas.toBlob returned null'));
          if (blob.size <= maxBytes || q - QUALITY_STEP < QUALITY_FLOOR) {
            resolve(blob);
          } else {
            attempt(parseFloat((q - QUALITY_STEP).toFixed(2)));
          }
        },
        'image/webp',
        q
      );
    };
    attempt(quality);
  });
}

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Wrap the HTMLImageElement in a canvas to get an ImageBitmap-like object
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      createImageBitmap(canvas).then(resolve).catch(reject);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = url;
  });
}
