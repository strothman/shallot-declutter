import { jsPDF } from 'jspdf';

/**
 * Enhances a document image using HTML5 Canvas
 * Increases contrast, handles binarization or sharpening for paper legibility
 */
export async function enhanceDocumentImage(
  dataUrl: string,
  options: { enhanceContrast?: boolean; grayscale?: boolean } = {}
): Promise<string> {
  const { enhanceContrast = true, grayscale = false } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0);

      if (enhanceContrast || grayscale) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Luminance calculation
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          if (grayscale) {
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }

          if (enhanceContrast) {
            // Adaptive contrast curve to whiten background and sharpen dark text
            const contrast = 1.35;
            const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
            const newR = factor * (data[i] - 128) + 128;
            const newG = factor * (data[i + 1] - 128) + 128;
            const newB = factor * (data[i + 2] - 128) + 128;

            data[i] = Math.min(255, Math.max(0, newR));
            data[i + 1] = Math.min(255, Math.max(0, newG));
            data[i + 2] = Math.min(255, Math.max(0, newB));
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });
}

/**
 * Compiles an array of page data URLs into a multi-page PDF Blob
 */
export async function createPdfFromPages(pages: string[]): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('No pages provided to compile PDF');
  }

  // Create standard A4 portrait PDF (210 x 297 mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }

    const pageDataUrl = pages[i];
    
    // Calculate aspect ratio to fit page cleanly with small margin
    const imgProps = await getImageDimensions(pageDataUrl);
    const margin = 10;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;

    const imgAspect = imgProps.width / imgProps.height;
    const pageAspect = maxW / maxH;

    let renderW = maxW;
    let renderH = maxH;
    let posX = margin;
    let posY = margin;

    if (imgAspect > pageAspect) {
      renderH = maxW / imgAspect;
      posY = margin + (maxH - renderH) / 2;
    } else {
      renderW = maxH * imgAspect;
      posX = margin + (maxW - renderW) / 2;
    }

    pdf.addImage(pageDataUrl, 'JPEG', posX, posY, renderW, renderH);
  }

  return pdf.output('blob');
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 1000, height: 1400 });
    img.src = dataUrl;
  });
}
