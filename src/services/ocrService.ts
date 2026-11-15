import { createWorker } from 'tesseract.js';
import { OCRProgress } from '../types';

/**
 * Preprocesses an image using HTML5 Canvas for optimal OCR accuracy.
 * Enhances contrast, converts to grayscale, and applies thresholding.
 */
export async function preprocessImage(
  imageSource: string | HTMLImageElement,
  options: {
    contrast?: number;
    brightness?: number;
    threshold?: boolean;
    thresholdLevel?: number;
  } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = typeof imageSource === 'string' ? new Image() : imageSource;
    if (typeof imageSource === 'string') {
      img.crossOrigin = 'anonymous';
      img.src = imageSource;
    }

    const process = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof imageSource === 'string' ? imageSource : img.src);
        return;
      }

      // Upscale low-res images if needed (minimum width 1200 for good OCR)
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      if (width < 1200 && width > 0) {
        const scale = 1200 / width;
        width = 1200;
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Get pixel data for grayscale & contrast
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;

      const contrast = options.contrast ?? 30; // -100 to 100
      const brightness = options.brightness ?? 10; // -100 to 100
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const threshLevel = options.thresholdLevel ?? 128;

      for (let i = 0; i < d.length; i += 4) {
        // Luminance grayscale
        let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

        // Brightness & Contrast
        gray = factor * (gray - 128) + 128 + brightness;
        gray = Math.min(255, Math.max(0, gray));

        if (options.threshold) {
          gray = gray >= threshLevel ? 255 : 0;
        }

        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    if (img.complete && img.naturalWidth > 0) {
      process();
    } else {
      img.onload = process;
      img.onerror = (e) => reject(e);
    }
  });
}

/**
 * Runs 100% offline local Tesseract OCR on an image data URL or file.
 */
export async function performOfflineOcr(
  imageSource: string,
  onProgress?: (p: OCRProgress) => void
): Promise<string> {
  try {
    if (onProgress) {
      onProgress({ status: 'Preprocessing image for OCR...', progress: 0.1 });
    }

    // Step 1: Preprocess to improve contrast
    let processedSource = imageSource;
    try {
      processedSource = await preprocessImage(imageSource, {
        contrast: 40,
        brightness: 10,
        threshold: false
      });
    } catch {
      processedSource = imageSource;
    }

    if (onProgress) {
      onProgress({ status: 'Initializing offline OCR engine...', progress: 0.25 });
    }

    // Step 2: Initialize Tesseract worker
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (onProgress && m.status) {
          const mappedProgress = 0.25 + (m.progress || 0) * 0.7;
          onProgress({
            status: m.status === 'recognizing text'
              ? `Reading text from bill (${Math.round((m.progress || 0) * 100)}%)...`
              : `${m.status}...`,
            progress: Math.min(0.95, mappedProgress)
          });
        }
      }
    });

    // Step 3: Recognize
    const ret = await worker.recognize(processedSource);
    await worker.terminate();

    if (onProgress) {
      onProgress({ status: 'Complete', progress: 1.0 });
    }

    return ret.data.text;
  } catch (err: any) {
    console.error('OCR Error:', err);
    throw new Error(`Offline OCR failed: ${err.message || err}`);
  }
}
