import { useEffect, useState, useRef } from 'react'
import { Button } from '@heroui/react'

interface Image {
  id: string
  fileUrl: string | null
  emotionType?: string | null
  category: string
  surpriseIndex?: number | null
}

interface ImageLightboxProps {
  imageArray: Image[]
  selectedId: string
  onClose: () => void
}

export function ImageLightbox({ imageArray, selectedId, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(
    imageArray.findIndex((img) => img.id === selectedId)
  )
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const currentImage = imageArray[currentIndex]

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < imageArray.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swipe left -> next image
        goToNext()
      } else {
        // Swipe right -> previous image
        goToPrevious()
      }
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden' // Lock scroll

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [currentIndex, onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <Button
        isIconOnly
        className="absolute top-4 right-4 z-10"
        onPress={onClose}
      >
        ✕
      </Button>

      {/* Left arrow */}
      {currentIndex > 0 && (
        <Button
          isIconOnly
          className="absolute left-4 z-10"
          onPress={(e) => {
            e.stopPropagation()
            goToPrevious()
          }}
        >
          ←
        </Button>
      )}

      {/* Image */}
      <div
        className="max-w-4xl max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.fileUrl || ''}
          alt={currentImage.emotionType || 'image'}
          className="w-full h-full object-contain rounded-lg"
        />

        {/* Image info */}
        <div className="mt-4 text-white text-center">
          <p className="text-lg font-semibold">
            {currentImage.emotionType
              ? `${currentImage.emotionType}`
              : `意外表情 ${currentImage.surpriseIndex}`}
          </p>
          <p className="text-sm text-gray-300">
            {currentIndex + 1} / {imageArray.length}
          </p>
        </div>
      </div>

      {/* Right arrow */}
      {currentIndex < imageArray.length - 1 && (
        <Button
          isIconOnly
          className="absolute right-4 z-10"
          onPress={(e) => {
            e.stopPropagation()
            goToNext()
          }}
        >
          →
        </Button>
      )}
    </div>
  )
}
