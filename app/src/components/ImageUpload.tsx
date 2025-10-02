import { useState, useRef } from 'react'

interface ImageUploadProps {
  onImageSelect: (imageData: { base64Data: string; mimeType: string } | null) => void
  disabled?: boolean
}

export function ImageUpload({ onImageSelect, disabled }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return
    }

    try {
      // Read file as base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const parts = dataUrl.split(',')
        if (parts.length !== 2) {
          alert('图片格式错误')
          return
        }
        const base64Data = parts[1] // Remove data:image/xxx;base64, prefix
        const mimeType = file.type

        // Set preview
        setPreviewUrl(dataUrl)

        // Notify parent
        onImageSelect({ base64Data, mimeType })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Failed to read file:', error)
      alert('读取图片失败，请重试')
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    onImageSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="image-upload-container">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
        }}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      {!previewUrl ? (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="upload-area"
          style={{
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: 'var(--space-6)',
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: 'rgba(255, 255, 255, 0.03)',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.5 : 1
          }}
        >
          <div className="text-gray-400 text-sm">
            <div className="mb-2 text-2xl">📷</div>
            <div>点击或拖拽上传图片</div>
            <div className="text-xs text-gray-600 mt-2">支持 PNG, JPG · 最大 5MB</div>
          </div>
        </div>
      ) : (
        <div
          className="preview-area"
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 'var(--space-4)'
          }}
        >
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              width: '100%',
              maxHeight: '200px',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
          <button
            onClick={handleRemove}
            disabled={disabled}
            style={{
              position: 'absolute',
              top: 'var(--space-2)',
              right: 'var(--space-2)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
