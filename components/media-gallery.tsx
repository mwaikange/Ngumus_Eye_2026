"use client"

import { Card } from "@/components/ui/card"
import { useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaItem {
  id: string
  url: string
  mime: string
  path: string
}

interface MediaGalleryProps {
  media: MediaItem[]
}

export function MediaGallery({ media }: MediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
  }

  const closeLightbox = () => {
    setSelectedIndex(null)
  }

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < media.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {media.map((item, index) => (
          <Card key={item.id} className="overflow-hidden cursor-pointer" onClick={() => openLightbox(index)}>
            <div className="aspect-square bg-muted flex items-center justify-center">
              {item.mime.startsWith("image/") ? (
                <img src={item.url || "/placeholder.svg"} alt="Incident media" className="w-full h-full object-cover" />
              ) : item.mime.startsWith("video/") ? (
                <video src={item.url} className="w-full h-full object-cover" />
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>

          {selectedIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/20"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {selectedIndex < media.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white hover:bg-white/20"
              onClick={goToNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          <div className="max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            {media[selectedIndex].mime.startsWith("image/") ? (
              <img
                src={media[selectedIndex].url || "/placeholder.svg"}
                alt="Incident media"
                className="max-w-full max-h-full object-contain"
              />
            ) : media[selectedIndex].mime.startsWith("video/") ? (
              <video src={media[selectedIndex].url} controls className="max-w-full max-h-full" />
            ) : null}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {selectedIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </>
  )
}
