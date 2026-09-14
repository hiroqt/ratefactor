/**
 * RateFactor Profile Avatar & Image Compression Engine
 * Compresses profile pictures to the lowest possible size with high visual quality.
 * Enforces the strict 2.0 MB maximum size limit.
 */

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const DEFAULT_AVATAR_DIMENSION = 512; // 512x512 max bounding box for retina avatars

export interface CompressedImageResult {
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  reductionPercentage: number;
  width: number;
  height: number;
  format: "image/webp" | "image/jpeg";
}

export interface CompressAvatarOptions {
  maxDimension?: number;
  initialQuality?: number;
  maxSizeBytes?: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1).replace(/\.0$/, "");
    return `${kb} KB`;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1");
  return `${mb} MB`;
}

/**
 * Compresses a user profile image file down to the lowest possible byte size
 * while preserving high visual quality. Ensures output is strictly <= 2 MB.
 */
export async function compressProfileImage(
  file: File | Blob,
  options: CompressAvatarOptions = {}
): Promise<CompressedImageResult> {
  const maxDim = options.maxDimension || DEFAULT_AVATAR_DIMENSION;
  const maxBytes = options.maxSizeBytes || MAX_AVATAR_SIZE_BYTES;
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    // 1. Validate file exists
    if (!file) {
      return reject(new Error("No image file provided for compression."));
    }

    // 2. Read file as Image
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image for compression. Invalid or corrupted format."));
      img.onload = () => {
        try {
          // 3. Compute dimensions with aspect ratio preservation
          let srcWidth = img.naturalWidth || img.width;
          let srcHeight = img.naturalHeight || img.height;

          if (!srcWidth || !srcHeight) {
            return reject(new Error("Image has invalid dimensions (0x0)."));
          }

          // Center-crop to square for profile avatar
          const minSide = Math.min(srcWidth, srcHeight);
          const cropX = Math.round((srcWidth - minSide) / 2);
          const cropY = Math.round((srcHeight - minSide) / 2);

          const targetSize = Math.min(maxDim, minSide);

          // 4. Create offscreen canvas for rendering
          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Failed to obtain 2D canvas context for image compression."));
          }

          // Image smoothing for superior downscaling quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Draw square cropped image
          ctx.drawImage(
            img,
            cropX,
            cropY,
            minSide,
            minSide,
            0,
            0,
            targetSize,
            targetSize
          );

          // 5. Try modern WebP compression first, fallback to JPEG
          let format: "image/webp" | "image/jpeg" = "image/webp";
          let quality = options.initialQuality || 0.85;
          let dataUrl = canvas.toDataURL(format, quality);

          // Verify if browser supports WebP canvas export
          if (!dataUrl.startsWith("data:image/webp")) {
            format = "image/jpeg";
            dataUrl = canvas.toDataURL(format, quality);
          }

          // Compute size in bytes of base64 data url
          const computeBytes = (uri: string): number => {
            const base64Str = uri.split(",")[1] || "";
            return Math.round((base64Str.length * 3) / 4);
          };

          let currentBytes = computeBytes(dataUrl);

          // If still above 2MB, progressively lower quality
          while (currentBytes > maxBytes && quality > 0.3) {
            quality -= 0.15;
            dataUrl = canvas.toDataURL(format, quality);
            currentBytes = computeBytes(dataUrl);
          }

          if (currentBytes > maxBytes) {
            return reject(
              new Error(
                `Image size (${formatFileSize(currentBytes)}) exceeds the maximum allowed limit of 2.00 MB.`
              )
            );
          }

          const reduction = originalSize > 0 
            ? Math.max(0, Math.round(((originalSize - currentBytes) / originalSize) * 100))
            : 0;

          resolve({
            dataUrl,
            originalSizeBytes: originalSize,
            compressedSizeBytes: currentBytes,
            reductionPercentage: reduction,
            width: targetSize,
            height: targetSize,
            format,
          });
        } catch (err: any) {
          reject(new Error(err?.message || "Error occurred during avatar compression."));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
