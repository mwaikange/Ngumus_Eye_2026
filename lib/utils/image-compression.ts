export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeMB?: number
}

/**
 * Compress an image file before upload
 * Reduces file size significantly while maintaining visual quality
 */
export async function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.7, maxSizeMB = 3 } = options

  // If file is already small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        let width = img.width
        let height = img.height

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          quality,
        )
      } catch (e) {
        resolve(file)
      }
    }

    img.onerror = () => resolve(file)
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Create an instant preview URL for a file
 * This shows immediately while the actual upload happens in background
 */
export function createFastPreview(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revoke a preview URL to free memory
 */
export function revokeFastPreview(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options: { maxSizeMB?: number; allowedTypes?: string[] } = {},
): { valid: boolean; error?: string } {
  const { maxSizeMB = 50, allowedTypes = ["image/", "video/"] } = options

  // Check file type
  const isAllowed = allowedTypes.some((type) => file.type.startsWith(type))
  if (!isAllowed) {
    return { valid: false, error: "File type not allowed" }
  }

  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File must be under ${maxSizeMB}MB` }
  }

  return { valid: true }
}
