import { useRef, useEffect, useState } from 'react'
import { Button } from '@heroui/react'

type FrameStyle = 'none' | 'white-border' | 'rounded' | 'polaroid'

interface FrameEditorProps {
  imageUrl: string
  frameStyle: FrameStyle
  onStyleChange: (style: FrameStyle) => void
  onExport?: () => Promise<Blob>
}

export function FrameEditor({
  imageUrl,
  frameStyle,
  onStyleChange,
}: FrameEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageData, setImageData] = useState<HTMLImageElement | null>(null)

  // Load image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => setImageData(img)
  }, [imageUrl])

  // Render Canvas
  useEffect(() => {
    if (!canvasRef.current || !imageData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = 512

    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    // Clear
    ctx.clearRect(0, 0, size, size)

    // Apply frame
    switch (frameStyle) {
      case 'none':
        ctx.drawImage(imageData, 0, 0, size, size)
        break

      case 'white-border':
        const borderWidth = 20
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(
          imageData,
          borderWidth,
          borderWidth,
          size - borderWidth * 2,
          size - borderWidth * 2
        )
        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetY = 4
        break

      case 'rounded':
        const radius = 40
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(radius, 0)
        ctx.arcTo(size, 0, size, size, radius)
        ctx.arcTo(size, size, 0, size, radius)
        ctx.arcTo(0, size, 0, 0, radius)
        ctx.arcTo(0, 0, size, 0, radius)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(imageData, 0, 0, size, size)
        ctx.restore()
        break

      case 'polaroid':
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(imageData, 20, 20, size - 40, size - 100)
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(20, size - 80, size - 40, 60)
        break
    }
  }, [imageData, frameStyle])

  const handleExport = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvasRef.current?.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Export failed'))
      }, 'image/png')
    })
  }

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-lg shadow-md"
      />

      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          color={frameStyle === 'none' ? 'primary' : 'default'}
          onPress={() => onStyleChange('none')}
        >
          无边框
        </Button>
        <Button
          size="sm"
          color={frameStyle === 'white-border' ? 'primary' : 'default'}
          onPress={() => onStyleChange('white-border')}
        >
          白色描边
        </Button>
        <Button
          size="sm"
          color={frameStyle === 'rounded' ? 'primary' : 'default'}
          onPress={() => onStyleChange('rounded')}
        >
          圆角
        </Button>
        <Button
          size="sm"
          color={frameStyle === 'polaroid' ? 'primary' : 'default'}
          onPress={() => onStyleChange('polaroid')}
        >
          宝丽来
        </Button>
      </div>
    </div>
  )
}
