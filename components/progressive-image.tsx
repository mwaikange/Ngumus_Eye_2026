"use client"

import { useState } from "react"
import Image from "next/image"

interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  fill?: boolean
  width?: number
  height?: number
  priority?: boolean
  onClick?: () => void
}

export function ProgressiveImage({
  src,
  alt,
  className = "",
  fill = false,
  width,
  height,
  priority = false,
  onClick,
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Generate a tiny placeholder color based on the src
  const placeholderColor = `hsl(${Math.abs(src.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 20%, 90%)`

  if (hasError) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={fill ? { position: "absolute", inset: 0 } : { width, height }}
      >
        <span className="text-gray-400 text-xs">Image unavailable</span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {/* Placeholder background */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${isLoaded ? "opacity-0" : "opacity-100"}`}
        style={{ backgroundColor: placeholderColor }}
      />

      {/* Shimmer effect while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}

      {fill ? (
        <Image
          src={src || "/placeholder.svg"}
          alt={alt}
          fill
          className={`object-cover transition-all duration-500 ${isLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          priority={priority}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : (
        <Image
          src={src || "/placeholder.svg"}
          alt={alt}
          width={width || 400}
          height={height || 300}
          className={`object-cover transition-all duration-500 ${isLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          priority={priority}
        />
      )}
    </div>
  )
}
