/**
 * High-performance browser-side image optimizer for personal data entry
 * Downscales 24MP-48MP smartphone camera photos (6MB-12MB) to crisp, high-fidelity
 * AI analysis representations (~200KB-400KB), preserving tiny fonts and dollar amounts
 * while speeding up upload transfer by 20x and avoiding API 503 timeouts.
 */
export async function optimizeImageForAi(
  dataUrl: string,
  maxDimension: number = 1920,
  quality: number = 0.85
): Promise<string> {
  // If PDF, pass through unchanged
  if (dataUrl.startsWith('data:application/pdf') || dataUrl.startsWith('JVBERi')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // If already within bounds, keep as is
      if (width <= maxDimension && height <= maxDimension) {
        resolve(dataUrl);
        return;
      }

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Smooth bicubic resampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      resolve(dataUrl); // Fallback to raw data if decode fails
    };

    img.src = dataUrl;
  });
}
