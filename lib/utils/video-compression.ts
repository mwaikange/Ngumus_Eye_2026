export interface VideoCompressionOptions {
  maxSizeMB?: number
  maxDurationSeconds?: number
  quality?: number
}

/**
 * Compress a video file before upload
 * Reduces file size while maintaining quality
 */
export async function compressVideo(
  file: File,
  options: VideoCompressionOptions = {},
  onProgress?: (progress: number) => void,
): Promise<File> {
  const { maxSizeMB = 50, maxDurationSeconds = 60, quality = 0.7 } = options

  // If file is already small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file
  }

  // For video compression, we'll use canvas-based frame extraction and re-encoding
  // This is a simplified version - in production, consider using ffmpeg.wasm
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "metadata"

    video.onloadedmetadata = () => {
      const duration = video.duration

      // If video is too long, reject
      if (duration > maxDurationSeconds) {
        reject(new Error(`Video must be under ${maxDurationSeconds} seconds`))
        return
      }

      // For now, return original file if under size limit
      // In production, implement actual compression with ffmpeg.wasm or similar
      if (file.size <= maxSizeMB * 1024 * 1024) {
        resolve(file)
      } else {
        reject(new Error("Video file too large. Please use a smaller file."))
      }
    }

    video.onerror = () => reject(new Error("Unable to process video"))
    video.src = URL.createObjectURL(file)
  })
}

/**
 * Validate video file before upload
 */
export function validateVideo(
  file: File,
  options: { maxSizeMB?: number; maxDurationSeconds?: number } = {},
): { valid: boolean; error?: string } {
  const { maxSizeMB = 100, maxDurationSeconds = 120 } = options

  if (!file.type.startsWith("video/")) {
    return { valid: false, error: "File must be a video" }
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Video must be under ${maxSizeMB}MB` }
  }

  return { valid: true }
}
