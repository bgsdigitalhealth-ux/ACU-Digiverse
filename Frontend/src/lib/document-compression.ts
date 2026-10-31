/**
 * Compresses an image blob (JPEG, PNG, WebP) using HTML Canvas.
 * Resizes large dimensions to a maximum boundary (e.g., 1920px) and applies quality compression (0.8).
 * Falls back safely to the original blob if compression fails or if the output is larger.
 */
export async function compressImageBlob(blob: Blob, maxWidth = 1920, maxHeight = 1920, quality = 0.82): Promise<{ blob: Blob; type: string }> {
  if (typeof window === "undefined" || !blob.type.startsWith("image/")) {
    return { blob, type: blob.type };
  }

  // SVG images shouldn't be compressed via canvas
  if (blob.type === "image/svg+xml" || blob.type === "image/gif") {
    return { blob, type: blob.type };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Calculate scaled dimensions while preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return resolve({ blob, type: blob.type });
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP or JPEG for optimal compression
      const outputType = blob.type === "image/png" ? "image/jpeg" : blob.type;

      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob && compressedBlob.size < blob.size) {
            resolve({ blob: compressedBlob, type: outputType });
          } else {
            // Keep original if compressed version isn't smaller
            resolve({ blob, type: blob.type });
          }
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob, type: blob.type });
    };

    img.src = url;
  });
}
