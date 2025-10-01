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
      return data?.status === 'GENERATING' ? 5000 : false
    },
  })

  // WebSocket real-time progress
  const { progress } = useProjectProgress(id, data?.status === 'GENERATING')

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
  const emotionImageArray = project.images.filter((img) => img.category === 'EMOTION')
  const surpriseImageArray = project.images.filter((img) => img.category === 'SURPRISE')
  const completedCount = project.images.filter((img) => img.status === 'SUCCESS').length
  const totalCount = project.images.length
  const progressValue = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const isGenerating = project.status === 'GENERATING'
  const isCompleted = project.status === 'COMPLETED' || project.status === 'PARTIAL_FAILED'
  const failedImageArray = project.images.filter((img) => img.status === 'FAILED')

  const handleDownloadAll = async () => {
    setIsDownloading(true)

    try {
      const imagesToDownload = project.images
        .filter((img) => img.status === 'SUCCESS' && img.fileUrl)
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
    if (image.category === 'EMOTION') {
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-violet-50/50 via-purple-50/30 to-pink-50/50">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl" />

      <main className="relative max-w-7xl mx-auto px-4 py-12">
        {isGenerating && (
          <Card className="mb-8 glass-card border-0 shadow-xl animate-fade-in">
            <CardBody className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
                    <span className="text-white text-2xl">✨</span>
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    AI 创作中...
                  </h1>
                  <p className="text-gray-600 text-sm mt-1">魔法正在发生，请稍候</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">生成进度</span>
                  <span className="text-sm font-bold text-violet-600">
                    {completedCount}/{totalCount} 张完成
                  </span>
                </div>
                <Progress
                  value={progressValue}
                  color="primary"
                  size="lg"
                  className="max-w-full"
                  classNames={{
                    indicator: "bg-gradient-to-r from-violet-500 to-purple-600",
                  }}
                />
                {progress && (
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>实时同步 · 最新更新：{new Date(progress.timestamp).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {isCompleted && (
          <div className="mb-8 space-y-6 animate-fade-in">
            {/* Success Header */}
            <Card className="glass-card border-0 shadow-xl overflow-hidden">
              <CardBody className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-3xl">🎉</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      创作完成！
                    </h1>
                    <p className="text-gray-600 text-sm mt-1">你的专属表情包已经准备好了</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <Button
                    color="secondary"
                    size="lg"
                    className="shadow-lg hover:shadow-xl transition-shadow"
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
                    <span className="flex items-center gap-2">
                      <span>🔄</span>
                      <span>Remix 这个项目</span>
                    </span>
                  </Button>

                  <Button
                    color="secondary"
                    size="lg"
                    variant="flat"
                    onPress={handleShare}
                  >
                    <span className="flex items-center gap-2">
                      <span>🔗</span>
                      <span>分享作品</span>
                    </span>
                  </Button>

                  <Button
                    onClick={handleDownloadAll}
                    isLoading={isDownloading}
                    size="lg"
                    color="primary"
                    className="shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all"
                  >
                    {isDownloading ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        打包中 {downloadProgress.current}/{downloadProgress.total}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span>📦</span>
                        <span>下载全部 ZIP</span>
                      </span>
                    )}
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Frame Style Selector */}
            <Card className="glass-card border-0 shadow-lg">
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-lg">🖼️</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">相框样式</h3>
                </div>

                <div className="flex gap-2 flex-wrap mb-4">
                  {[
                    { id: 'none', label: '无边框', icon: '⭕' },
                    { id: 'white-border', label: '白色描边', icon: '⬜' },
                    { id: 'rounded', label: '圆角', icon: '🔲' },
                    { id: 'polaroid', label: '宝丽来', icon: '📸' },
                    { id: 'custom', label: '自定义', icon: '⚙️' },
                  ].map((style) => (
                    <Button
                      key={style.id}
                      size="sm"
                      variant={frameStyle === style.id ? 'solid' : 'flat'}
                      color={frameStyle === style.id ? 'primary' : 'default'}
                      onPress={() => setFrameStyle(style.id as FrameStyle)}
                      className="transition-all"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{style.icon}</span>
                        <span>{style.label}</span>
                      </span>
                    </Button>
                  ))}
                </div>

                {/* Advanced Frame Editor */}
                {frameStyle === 'custom' && (
                  <div className="pt-4 border-t border-gray-100">
                    <AdvancedFrameEditor
                      config={frameConfig}
                      onChange={setFrameConfig}
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        <div className="space-y-8">
          {/* Emotion Images Section */}
          <Card className="glass-card border-0 shadow-lg">
            <CardBody className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">😊</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">九宫格情绪表情</h2>
                </div>
                {failedImageArray.length > 0 && (
                  <Button
                    color="warning"
                    size="sm"
                    variant="flat"
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
                    🔄 重试失败 ({failedImageArray.length})
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                {emotionImageArray.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    frameStyle={frameStyle}
                    frameConfig={frameConfig}
                    projectId={id}
                    onPress={() => image.status === 'SUCCESS' && setSelectedImageId(image.id)}
                  />
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Surprise images - Phase 2 */}
          {surpriseImageArray.length > 0 && (
            <Card className="glass-card border-0 shadow-lg">
              <CardBody className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">✨</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">意外惊喜表情</h2>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 sm:gap-4 overflow-x-auto surprise-row">
                  {surpriseImageArray.map((image) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      frameStyle={frameStyle}
                      frameConfig={frameConfig}
                      projectId={id}
                      compact
                      onPress={() => image.status === 'SUCCESS' && setSelectedImageId(image.id)}
                    />
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Lightbox */}
        {selectedImageId && (
          <ImageLightbox
            imageArray={project.images.filter((img) => img.status === 'SUCCESS')}
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
    if (frameStyle === 'none' || image.status !== 'SUCCESS' || !image.fileUrl) {
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
      const filename = image.category === 'EMOTION'
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

  if (image.status === 'PENDING') {
    return (
      <Card className="aspect-square border-0 shadow-md">
        <CardBody className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-gray-400 text-center">
            <svg
              className="w-12 h-12 mx-auto mb-2 animate-pulse"
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
            <p className="text-sm font-medium">等待中...</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (image.status === 'GENERATING') {
    return (
      <Card className="aspect-square border-0 shadow-md overflow-hidden">
        <CardBody className="flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }} />
          <Spinner size="lg" color="primary" />
        </CardBody>
      </Card>
    )
  }

  if (image.status === 'FAILED') {
    return (
      <Card className="aspect-square border-2 border-red-200 shadow-md">
        <CardBody className="flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 p-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <p className="text-red-600 text-sm font-semibold mb-2 text-center">生成失败</p>
          {image.errorMessage && (
            <p className="text-xs text-red-500/80 mb-3 text-center line-clamp-2">
              {image.errorMessage}
            </p>
          )}
          <Button
            size="sm"
            color="danger"
            variant="flat"
            onPress={() => retryMutation.mutate(image.id)}
            isLoading={retryMutation.isPending}
            className="mt-2"
          >
            🔄 重试
          </Button>
        </CardBody>
      </Card>
    )
  }

  // status === 'SUCCESS'
  const shouldUseCanvas = frameStyle !== 'none' && imageData

  return (
    <Card
      isPressable
      onPress={onPress || handleDownload}
      className="aspect-square overflow-hidden group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-300"
    >
      <CardBody className="p-0 relative">
        {shouldUseCanvas ? (
          <canvas
            ref={(el) => canvasRef[1](el)}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
          />
        ) : (
          <img
            src={image.fileUrl || ''}
            alt={image.emotionType || 'emotion'}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-violet-600/0 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Label */}
        {!compact && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <p className="text-white text-base font-semibold text-center drop-shadow-lg">
              {image.emotionType ? EMOTION_LABELS[image.emotionType] || image.emotionType : ''}
            </p>
          </div>
        )}

        {/* Download hint on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <span className="text-sm">📥</span>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
