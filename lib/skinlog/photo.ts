const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

export function captureVideoFrame(
  video: HTMLVideoElement,
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY,
): Promise<string> {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    return Promise.reject(new Error("Camera is not ready yet."));
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Could not process image."));
  }

  context.drawImage(video, 0, 0, targetWidth, targetHeight);
  return Promise.resolve(canvas.toDataURL("image/jpeg", quality));
}
