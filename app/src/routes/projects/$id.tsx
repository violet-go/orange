import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  Button,
  Card,
  CardBody,
  Progress,
  Spinner,
  Modal,
  ModalContent,
  ModalBody,
} from '@heroui/react'
import QRCode from 'qrcode'
import { graphqlClient } from '../../lib/graphql/client'
import { GET_PROJECT_QUERY } from '../../lib/graphql/queries'
import { RETRY_IMAGE_MUTATION } from '../../lib/graphql/mutations'
import { useProjectProgress } from '../../hooks/useProjectProgress'
import { downloadImagesAsZip } from '../../utils/zipDownload'
import { ImageLightbox } from '../../components/ImageLightbox'
import {
  AdvancedFrameEditor,
  type FrameConfig,
} from '../../components/AdvancedFrameEditor'

type FrameStyle = 'none' | 'white-border' | 'rounded' | 'polaroid' | 'custom'

export const Route = createFileRoute('/projects/$id')({
  component: ProjectDetailPage,
})

interface Image {
  id: string
  category: string
  emotionType: string | null
  surpriseIndex: number | null
  prompt: string
  fileUrl: string | null
  status: string
  errorMessage: string | null
  width: number
  height: number
  createdAt: string
}

interface Style {
  id: string
  displayName: string
}

interface Project {
  id: string
  inputType: string
  inputContent: string
  status: string
  createdAt: string
  style: Style | null
  images: Image[]
}

interface ProjectResponse {
  project: Project
}

const EMOTION_LABELS: Record<string, string> = {
  happy: '开心',
  sad: '难过',
  angry: '生气',
  surprised: '惊讶',
  thinking: '思考',
  shy: '害羞',
  proud: '骄傲',
  tired: '疲倦',
  love: '爱心',
}

function ProjectDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('none')
  const [frameConfig, setFrameConfig] = useState<FrameConfig>({
    style: 'custom',
    borderWidth: 20,
    borderColor: '#ffffff',
    shadowBlur: 10,
    shadowOffsetX: 0,
    shadowOffsetY: 4,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 0,
  })
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await graphqlClient.request<ProjectResponse>(
        GET_PROJECT_QUERY,
        { id }
      )
      return response.project
    },
    refetchInterval: (data) => {
      // Fallback to polling if WebSocket fails - only if generating
      return data?.status === 'generating' ? 5000 : false
    },
  })

  // WebSocket real-time progress
  const { progress } = useProjectProgress(id, data?.status === 'generating')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardBody>
            <p className="text-red-500">加载失败，请重试</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  const project = data
  const emotionImageArray = project.images.filter((img) => img.category === 'emotion')
  const surpriseImageArray = project.images.filter((img) => img.category === 'surprise')
  const completedCount = project.images.filter((img) => img.status === 'success').length
  const totalCount = project.images.length
  const progressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const isGenerating = project.status === 'generating'
  const isCompleted = project.status === 'completed' || project.status === 'partial_failed'
  const failedImageArray = project.images.filter((img) => img.status === 'failed')

  const handleDownloadAll = async () => {
    setIsDownloading(true)

    try {
      const imagesToDownload = project.images
        .filter((img) => img.status === 'success' && img.fileUrl)
        .map((img) => ({
          url: img.fileUrl!,
          filename: getImageFileName(img),
        }))

      await downloadImagesAsZip(
        imagesToDownload,
        `peelpack-${project.id}.zip`,
        (current, total) => {
          setDownloadProgress({ current, total })
        }
      )

      alert('下载成功！')
    } catch (error) {
      console.error('Download failed:', error)
      alert('下载失败，请重试')
    } finally {
      setIsDownloading(false)
    }
  }

  function getImageFileName(image: Image): string {
    if (image.category === 'emotion') {
      return `emotion-${image.emotionType}.png`
    } else {
      return `surprise-${String(image.surpriseIndex).padStart(2, '0')}.png`
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/share/${id}`
    setShareUrl(url)

    try {
      const qr = await QRCode.toDataURL(url)
      setQrCodeUrl(qr)
    } catch (error) {
      console.error('QR code generation failed:', error)
    }

    setShowShareModal(true)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('链接已复制！')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {isGenerating && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-4">正在生成贴纸包...</h1>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>生成进度</span>
                <span className="font-medium">
                  {completedCount}/{totalCount} 张完成
                </span>
              </div>
              <Progress
                value={progressValue}
                color="primary"
                className="max-w-full"
              />
              <p className="text-sm text-gray-500 text-center">
                请等待，正在生成中...
              </p>
              {progress && (
                <div className="text-xs text-gray-400 text-center mt-1">
                  最新更新：{new Date(progress.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-green-600 mb-4">
              贴纸包已完成 🎉
            </h1>

            <div className="flex gap-4 mb-4 flex-wrap">
              {/* Remix button */}
              <Button
                color="secondary"
                size="lg"
                onPress={() => {
                  navigate({
                    to: '/',
                    search: {
                      remix: id,
                      description: project.inputContent,
                      styleId: project.style?.id || null,
                    },
                  })
                }}
              >
                🔄 Remix 这个项目
              </Button>

              {/* Share button */}
              <Button color="secondary" size="lg" onPress={handleShare}>
                🔗 分享
              </Button>

              {/* Download all button */}
              <Button
                onClick={handleDownloadAll}
                isLoading={isDownloading}
                size="lg"
                color="primary"
              >
                {isDownloading
                  ? `打包中 ${downloadProgress.current}/${downloadProgress.total}`
                  : '下载全部 ZIP'}
              </Button>
            </div>

            {/* Frame style selector */}
            <div className="mb-4">
              <div className="flex gap-2 flex-wrap mb-4">
                <span className="text-sm text-gray-600 py-2">相框样式：</span>
                <Button
                  size="sm"
                  color={frameStyle === 'none' ? 'primary' : 'default'}
                  onPress={() => setFrameStyle('none')}
                >
                  无边框
                </Button>
                <Button
                  size="sm"
                  color={frameStyle === 'white-border' ? 'primary' : 'default'}
                  onPress={() => setFrameStyle('white-border')}
                >
                  白色描边
                </Button>
                <Button
                  size="sm"
                  color={frameStyle === 'rounded' ? 'primary' : 'default'}
                  onPress={() => setFrameStyle('rounded')}
                >
                  圆角
                </Button>
                <Button
                  size="sm"
                  color={frameStyle === 'polaroid' ? 'primary' : 'default'}
                  onPress={() => setFrameStyle('polaroid')}
                >
                  宝丽来
                </Button>
                <Button
                  size="sm"
                  color={frameStyle === 'custom' ? 'primary' : 'default'}
                  onPress={() => setFrameStyle('custom')}
                >
                  自定义
                </Button>
              </div>

              {/* Advanced Frame Editor */}
              {frameStyle === 'custom' && (
                <AdvancedFrameEditor
                  config={frameConfig}
                  onChange={setFrameConfig}
                />
              )}
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">九宫格情绪表情：</h2>
            {failedImageArray.length > 0 && (
              <Button
                color="warning"
                size="sm"
                className="mb-4"
                onPress={async () => {
                  const queryClient = useQueryClient()
                  await Promise.all(
                    failedImageArray.map((img) =>
                      graphqlClient.request(RETRY_IMAGE_MUTATION, { id: img.id })
                    )
                  )
                  queryClient.invalidateQueries(['project', id])
                }}
              >
                重试全部失败 ({failedImageArray.length})
              </Button>
            )}

            <div className="grid grid-cols-3 gap-4">
              {emotionImageArray.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  frameStyle={frameStyle}
                  frameConfig={frameConfig}
                  projectId={id}
                  onPress={() => image.status === 'success' && setSelectedImageId(image.id)}
                />
              ))}
            </div>
          </div>

          {/* Surprise images - Phase 2 新增 */}
          {surpriseImageArray.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">意外表情：</h2>
              <div className="grid grid-cols-7 gap-3 md:grid-cols-7 overflow-x-auto surprise-row">
                {surpriseImageArray.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    frameStyle={frameStyle}
                    frameConfig={frameConfig}
                    projectId={id}
                    compact
                    onPress={() => image.status === 'success' && setSelectedImageId(image.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lightbox */}
        {selectedImageId && (
          <ImageLightbox
            imageArray={project.images.filter((img) => img.status === 'success')}
            selectedId={selectedImageId}
            onClose={() => setSelectedImageId(null)}
          />
        )}

        {/* Share Modal */}
        <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)}>
          <ModalContent>
            <ModalBody className="p-6">
              <h3 className="text-xl font-bold mb-4">分享这个项目</h3>

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                )}
              </div>

              {/* Share URL */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded"
                />
                <Button color="primary" onPress={handleCopyLink}>
                  复制链接
                </Button>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                任何人通过此链接都可以查看你的作品
              </p>
            </ModalBody>
          </ModalContent>
        </Modal>
      </main>
    </div>
  )
}

function ImageCard({
  image,
  compact = false,
  frameStyle = 'none',
  frameConfig,
  projectId,
  onPress
}: {
  image: Image
  compact?: boolean
  frameStyle?: FrameStyle
  frameConfig?: FrameConfig
  projectId: string
  onPress?: () => void
}) {
  const queryClient = useQueryClient()

  const retryMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await graphqlClient.request(RETRY_IMAGE_MUTATION, {
        id: imageId,
      })
      return response.retryImage
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project', projectId])
    },
  })
  const canvasRef = useState<HTMLCanvasElement | null>(null)
  const [imageData, setImageData] = useState<HTMLImageElement | null>(null)

  // Load image for canvas rendering
  useEffect(() => {
    if (frameStyle === 'none' || image.status !== 'success' || !image.fileUrl) {
      setImageData(null)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = image.fileUrl
    img.onload = () => setImageData(img)
  }, [image.fileUrl, frameStyle, image.status])

  // Render canvas when image data or frame style changes
  useEffect(() => {
    if (!canvasRef[0] || !imageData) return

    const canvas = canvasRef[0]
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = 512

    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, size, size)

    switch (frameStyle) {
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

      case 'custom':
        if (!frameConfig) break

        const bw = frameConfig.borderWidth
        const br = frameConfig.borderRadius

        // Fill background
        ctx.fillStyle = frameConfig.borderColor
        ctx.fillRect(0, 0, size, size)

        // Apply shadow
        ctx.shadowColor = frameConfig.shadowColor
        ctx.shadowBlur = frameConfig.shadowBlur
        ctx.shadowOffsetX = frameConfig.shadowOffsetX
        ctx.shadowOffsetY = frameConfig.shadowOffsetY

        // Draw image with border radius
        if (br > 0) {
          ctx.save()
          ctx.beginPath()
          const x = bw
          const y = bw
          const w = size - bw * 2
          const h = size - bw * 2
          ctx.moveTo(x + br, y)
          ctx.arcTo(x + w, y, x + w, y + h, br)
          ctx.arcTo(x + w, y + h, x, y + h, br)
          ctx.arcTo(x, y + h, x, y, br)
          ctx.arcTo(x, y, x + w, y, br)
          ctx.closePath()
          ctx.clip()
          ctx.drawImage(imageData, bw, bw, size - bw * 2, size - bw * 2)
          ctx.restore()
        } else {
          ctx.drawImage(imageData, bw, bw, size - bw * 2, size - bw * 2)
        }
        break
    }
  }, [imageData, frameStyle, frameConfig, canvasRef])
  const handleDownload = async () => {
    if (!image.fileUrl) return

    try {
      const response = await fetch(image.fileUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = image.category === 'emotion'
        ? `emotion-${image.emotionType}.png`
        : `surprise-${String(image.surpriseIndex).padStart(2, '0')}.png`
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      alert('下载失败，请重试')
    }
  }

  if (image.status === 'pending') {
    return (
      <Card className="aspect-square">
        <CardBody className="flex items-center justify-center bg-gray-50">
          <div className="text-gray-400 text-center">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">等待中</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (image.status === 'generating') {
    return (
      <Card className="aspect-square">
        <CardBody className="flex items-center justify-center bg-gray-50">
          <Spinner size="lg" color="primary" />
        </CardBody>
      </Card>
    )
  }

  if (image.status === 'failed') {
    return (
      <Card className="aspect-square border-red-200">
        <CardBody className="flex flex-col items-center justify-center bg-red-50 p-4">
          <p className="text-red-600 text-sm mb-2 text-center">生成失败</p>
          {image.errorMessage && (
            <p className="text-xs text-red-500 mb-3 text-center">
              {image.errorMessage}
            </p>
          )}
          <Button
            size="sm"
            color="danger"
            onPress={() => retryMutation.mutate(image.id)}
            isLoading={retryMutation.isPending}
          >
            重试
          </Button>
        </CardBody>
      </Card>
    )
  }

  // status === 'success'
  const shouldUseCanvas = frameStyle !== 'none' && imageData

  return (
    <Card
      isPressable
      onPress={onPress || handleDownload}
      className="aspect-square overflow-hidden group cursor-pointer"
    >
      <CardBody className="p-0 relative">
        {shouldUseCanvas ? (
          <canvas
            ref={(el) => canvasRef[1](el)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <img
            src={image.fileUrl || ''}
            alt={image.emotionType || 'emotion'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {!compact && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <p className="text-white text-sm font-medium text-center">
              {image.emotionType ? EMOTION_LABELS[image.emotionType] || image.emotionType : ''}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
