# Phase 2 开发指令 - 完整体验

## 📍 当前状态

✅ **Phase 1 已完成** (commit: cd09d2e, ad91b08)
- TanStack Start + Hero UI 初始化完成
- 首页生成器：文字输入 + 验证 + 加载状态
- 项目详情页：5 秒轮询 + 3×3 网格 + 点击下载
- GraphQL HTTP Client 集成（graphql-request）
- 9 张情绪贴纸生成流程打通

✅ **验收标准：Phase 1 PASS** (8/8)
- 自动聚焦、输入验证、加载状态 ✅
- 5 秒轮询、进度条显示、自动停止 ✅
- 3×3 响应式布局、悬停效果 ✅
- 点击下载、文件名正确 ✅

## 🎯 Phase 2 目标

实现**完整的贴纸包生成体验**：实时进度推送、多风格选择、16 张完整贴纸、相框自定义、批量下载、全屏预览。

**核心升级**：
- 轮询 → WebSocket 实时推送（< 1s 延迟）
- 9 张 → 16 张（9 情绪 + 7 意外）
- 单张下载 → ZIP 批量下载
- 简单展示 → Lightbox 预览 + Canvas 相框

**验收标准**：用户体验流畅，功能完备，动画自然（60fps）

---

## 🚀 快速启动步骤

### Step 1: 风格选择器 UI (45 分钟)

**当前状态**：首页跳过风格选择（`styleId: null`）

**任务**：实现风格卡片网格，支持选择和高亮

**实现文件**：`app/src/components/StylePicker.tsx`

```typescript
// app/src/components/StylePicker.tsx
import { useQuery } from '@tanstack/react-query'
import { Card, CardBody, Skeleton } from '@heroui/react'
import { graphqlClient } from '../lib/graphql/client'
import { GET_STYLES_QUERY } from '../lib/graphql/queries'

interface Style {
  id: string
  displayName: string
  description: string
  thumbnailUrl: string | null
}

interface StylePickerProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function StylePicker({ selectedId, onSelect }: StylePickerProps) {
  const { data: styles, isLoading } = useQuery({
    queryKey: ['styles'],
    queryFn: async () => {
      const response = await graphqlClient.request<{ styles: Style[] }>(
        GET_STYLES_QUERY
      )
      return response.styles
    },
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 无风格选项 */}
      <StyleCard
        id={null}
        displayName="无"
        description="不使用预设风格"
        thumbnailUrl={null}
        isSelected={selectedId === null}
        onSelect={() => onSelect(null)}
      />

      {/* 预设风格 */}
      {styles?.map((style) => (
        <StyleCard
          key={style.id}
          {...style}
          isSelected={selectedId === style.id}
          onSelect={() => onSelect(style.id)}
        />
      ))}
    </div>
  )
}

interface StyleCardProps {
  id: string | null
  displayName: string
  description: string
  thumbnailUrl: string | null
  isSelected: boolean
  onSelect: () => void
}

function StyleCard({
  displayName,
  description,
  thumbnailUrl,
  isSelected,
  onSelect,
}: StyleCardProps) {
  return (
    <Card
      isPressable
      onPress={onSelect}
      className={`transition-all duration-200 ${
        isSelected
          ? 'border-4 border-primary shadow-lg scale-105'
          : 'border-2 border-gray-200 hover:border-gray-300'
      }`}
    >
      <CardBody className="p-4">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={displayName}
            className="w-full aspect-square object-cover rounded-lg mb-3"
          />
        )}
        <h3 className="font-semibold text-gray-900 mb-1">{displayName}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
        {isSelected && (
          <div className="mt-2 flex items-center text-primary">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-medium">已选择</span>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
```

**更新首页**：`app/src/routes/index.tsx`

```typescript
// 添加 state
const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null)

// 添加组件
<div>
  <h3 className="text-lg font-semibold mb-4">选择风格：</h3>
  <StylePicker selectedId={selectedStyleId} onSelect={setSelectedStyleId} />
</div>

// 更新 mutation
createProject.mutate({
  inputType: 'TEXT',
  inputContent: description,
  styleId: selectedStyleId, // 使用选中的风格
})
```

**验证**：
```bash
# 启动开发服务器
cd app && bun --bun run dev

# 访问 http://localhost:5173
# 1. 应显示风格卡片网格（2 列移动端，4 列桌面端）
# 2. 点击风格卡片，边框高亮 + 显示"已选择"
# 3. 切换风格，前一个恢复默认
# 4. 生成时携带 styleId
```

### Step 2: WebSocket 实时推送 (60 分钟)

**当前状态**：5 秒 HTTP 轮询（延迟明显）

**任务**：集成 graphql-ws，实现 < 1s 实时推送

**安装依赖**：
```bash
cd app
bun add graphql-ws
```

**创建 WebSocket Client**：`app/src/lib/graphql/wsClient.ts`

```typescript
import { createClient } from 'graphql-ws'

export const wsClient = createClient({
  url: 'ws://localhost:3000/graphql',
  retryAttempts: 3,
  shouldRetry: () => true,
  connectionParams: () => ({
    // 可传递认证 token
  }),
})

// 清理函数（组件卸载时调用）
export const cleanupWsClient = () => {
  wsClient.dispose()
}
```

**创建 Subscription Hook**：`app/src/hooks/useProjectProgress.ts`

```typescript
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { wsClient } from '../lib/graphql/wsClient'
import { PROJECT_PROGRESS_SUBSCRIPTION } from '../lib/graphql/subscriptions'

interface ProgressUpdate {
  projectId: string
  status: string
  completedCount: number
  totalCount: number
  latestImage?: {
    id: string
    category: string
    emotionType: string | null
    fileUrl: string
    status: string
  }
  timestamp: string
}

export function useProjectProgress(projectId: string, enabled: boolean = true) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const unsubscribe = wsClient.subscribe(
      {
        query: PROJECT_PROGRESS_SUBSCRIPTION,
        variables: { projectId },
      },
      {
        next: (data) => {
          const update = data.data?.projectProgress as ProgressUpdate
          setProgress(update)

          // 更新 TanStack Query 缓存
          queryClient.setQueryData(['project', projectId], (old: any) => {
            if (!old) return old
            return {
              ...old,
              status: update.status,
              images: update.latestImage
                ? updateImageInArray(old.images, update.latestImage)
                : old.images,
            }
          })
        },
        error: (err) => {
          console.error('Subscription error:', err)
          setError(err as Error)
        },
        complete: () => {
          console.log('Subscription completed')
        },
      }
    )

    return () => {
      unsubscribe()
    }
  }, [projectId, enabled, queryClient])

  return { progress, error }
}

function updateImageInArray(images: any[], newImage: any) {
  const index = images.findIndex((img) => img.id === newImage.id)
  if (index === -1) return images
  const updated = [...images]
  updated[index] = { ...updated[index], ...newImage }
  return updated
}
```

**添加 Subscription Query**：`app/src/lib/graphql/subscriptions.ts`

```typescript
import { gql } from 'graphql-request'

export const PROJECT_PROGRESS_SUBSCRIPTION = gql`
  subscription ProjectProgress($projectId: ID!) {
    projectProgress(projectId: $projectId) {
      projectId
      status
      completedCount
      totalCount
      latestImage {
        id
        category
        emotionType
        fileUrl
        status
      }
      timestamp
    }
  }
`
```

**更新项目详情页**：`app/src/routes/projects/$id.tsx`

```typescript
import { useProjectProgress } from '../../hooks/useProjectProgress'

// 在 ProjectDetailPage 组件中
const { progress } = useProjectProgress(id, project?.status === 'generating')

// 显示实时进度
{progress && (
  <div className="text-sm text-gray-500">
    最新更新：{new Date(progress.timestamp).toLocaleTimeString()}
  </div>
)}
```

**降级策略**：保留轮询作为备用

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['project', id],
  queryFn: async () => { /* ... */ },
  refetchInterval: (data) => {
    // 如果 WebSocket 连接失败，降级到轮询
    const isGenerating = data?.status === 'generating'
    const wsConnected = wsClient.getState() === 'connected' // 需要实现
    return isGenerating && !wsConnected ? 5000 : false
  },
})
```

**验证**：
```bash
# 1. 启动后端和前端
bun run index.ts  # 后端
bun --bun run dev # 前端

# 2. 打开 DevTools → Network → WS
# 3. 创建项目，观察 WebSocket 连接
# 4. 应该看到实时消息推送（< 1s 延迟）
# 5. 图片出现速度明显快于轮询版本
```

### Step 3: 16 张贴纸支持 (30 分钟)

**当前状态**：只显示 9 张情绪表情

**任务**：添加 7 张意外表情横向滚动行

**更新项目详情页**：`app/src/routes/projects/$id.tsx`

```typescript
// 分类图片
const emotionImages = project.images.filter((img) => img.category === 'emotion')
const surpriseImages = project.images.filter((img) => img.category === 'surprise')

// 渲染九宫格
<div className="space-y-8">
  <div>
    <h2 className="text-xl font-semibold mb-4">九宫格情绪表情：</h2>
    <div className="grid grid-cols-3 gap-4">
      {emotionImages.map((image) => (
        <ImageCard key={image.id} image={image} />
      ))}
    </div>
  </div>

  {/* 意外表情 - Phase 2 新增 */}
  {surpriseImages.length > 0 && (
    <div>
      <h2 className="text-xl font-semibold mb-4">意外表情：</h2>
      <div className="grid grid-cols-7 gap-3 md:grid-cols-7 overflow-x-auto">
        {surpriseImages.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            showLabel={false}
            compact
          />
        ))}
      </div>
    </div>
  )}
</div>
```

**移动端优化**：

```css
/* 添加到 styles.css */
@media (max-width: 768px) {
  .surprise-row {
    display: flex;
    overflow-x: auto;
    gap: 0.75rem;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  .surprise-row > * {
    scroll-snap-align: start;
    flex-shrink: 0;
    width: 80px;
  }

  /* 隐藏滚动条但保持功能 */
  .surprise-row::-webkit-scrollbar {
    display: none;
  }
}
```

**验证**：
```bash
# 1. 生成包含 16 张图片的项目
# 2. 桌面端：意外表情单行显示（7 列）
# 3. 移动端：横向滚动，滑动流畅
# 4. 两种布局都清晰可见
```

### Step 4: Canvas 相框渲染 (90 分钟)

**任务**：实现 4 种相框样式，实时预览和导出

**创建相框组件**：`app/src/components/FrameEditor.tsx`

```typescript
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

  // 加载图片
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => setImageData(img)
  }, [imageUrl])

  // 渲染 Canvas
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

    // 清空
    ctx.clearRect(0, 0, size, size)

    // 应用相框
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
        // 阴影
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
```

**性能优化**：懒加载 Canvas

```typescript
// 使用 Intersection Observer
import { useInView } from 'react-intersection-observer'

function LazyFrameEditor(props: FrameEditorProps) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <div ref={ref}>
      {inView ? <FrameEditor {...props} /> : <Skeleton className="aspect-square" />}
    </div>
  )
}
```

**验证**：
```bash
# 1. 生成完成后，切换相框样式
# 2. Canvas 实时渲染（< 500ms）
# 3. 16 张图片同时渲染不卡顿
# 4. 导出的图片包含相框效果
```

### Step 5: ZIP 批量下载 (45 分钟)

**任务**：使用 JSZip 打包所有图片为 ZIP

**安装依赖**：
```bash
cd app
bun add jszip file-saver
bun add -d @types/file-saver
```

**创建下载工具**：`app/src/utils/zipDownload.ts`

```typescript
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface ImageToDownload {
  url: string
  filename: string
}

export async function downloadImagesAsZip(
  images: ImageToDownload[],
  zipFilename: string,
  onProgress?: (current: number, total: number) => void
) {
  const zip = new JSZip()
  const emotionsFolder = zip.folder('emotions')
  const surprisesFolder = zip.folder('surprises')

  // 并发下载（每批 5 个）
  const batchSize = 5
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (img, idx) => {
        try {
          const response = await fetch(img.url)
          if (!response.ok) throw new Error(`Failed to fetch ${img.url}`)

          const blob = await response.blob()
          const folder = img.filename.startsWith('emotion-')
            ? emotionsFolder
            : surprisesFolder

          folder?.file(img.filename, blob)
          onProgress?.(i + idx + 1, images.length)
        } catch (error) {
          console.error(`Failed to download ${img.filename}:`, error)
        }
      })
    )
  }

  // 生成 ZIP
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // 触发下载
  saveAs(zipBlob, zipFilename)
}
```

**添加下载按钮**：`app/src/routes/projects/$id.tsx`

```typescript
const [isDownloading, setIsDownloading] = useState(false)
const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })

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

// 文件名生成
function getImageFileName(image: Image): string {
  if (image.category === 'emotion') {
    return `emotion-${image.emotionType}.png`
  } else {
    return `surprise-${String(image.surpriseIndex).padStart(2, '0')}.png`
  }
}

// UI
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
```

**验证**：
```bash
# 1. 点击"下载全部"
# 2. 显示打包进度
# 3. 5-10 秒后触发浏览器下载
# 4. 解压 ZIP，验证结构：
#    emotions/happy.png, sad.png, ...
#    surprises/01.png, 02.png, ...
# 5. 所有图片完整无损
```

### Step 6: Lightbox 预览 (60 分钟)

**任务**：实现全屏图片预览，支持键盘和触摸导航

**创建 Lightbox 组件**：`app/src/components/ImageLightbox.tsx`

```typescript
import { useEffect } from 'react'
import { Button } from '@heroui/react'

interface Image {
  id: string
  fileUrl: string
  emotionType?: string
  category: string
}

interface ImageLightboxProps {
  images: Image[]
  selectedId: string
  onClose: () => void
}

export function ImageLightbox({ images, selectedId, onClose }: ImageLightboxProps) {
  const currentIndex = images.findIndex((img) => img.id === selectedId)
  const currentImage = images[currentIndex]

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevImage = images[currentIndex - 1]
      // 更新 URL 或 state
    }
  }

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const nextImage = images[currentIndex + 1]
      // 更新 URL 或 state
    }
  }

  // 键盘导航
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
    document.body.style.overflow = 'hidden' // 锁定滚动

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [currentIndex, onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <Button
        isIconOnly
        className="absolute top-4 right-4 z-10"
        onPress={onClose}
      >
        ✕
      </Button>

      {/* 左箭头 */}
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

      {/* 图片 */}
      <div
        className="max-w-4xl max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.fileUrl}
          alt={currentImage.emotionType || 'image'}
          className="w-full h-full object-contain rounded-lg"
        />

        {/* 图片信息 */}
        <div className="mt-4 text-white text-center">
          <p className="text-lg font-semibold">
            {currentImage.emotionType || `意外表情 ${currentIndex + 1}`}
          </p>
          <p className="text-sm text-gray-300">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      </div>

      {/* 右箭头 */}
      {currentIndex < images.length - 1 && (
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
```

**添加到项目详情页**：

```typescript
const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

// ImageCard 添加点击事件
<ImageCard
  image={image}
  onPress={() => setSelectedImageId(image.id)}
/>

// 渲染 Lightbox
{selectedImageId && (
  <ImageLightbox
    images={project.images.filter((img) => img.status === 'success')}
    selectedId={selectedImageId}
    onClose={() => setSelectedImageId(null)}
  />
)}
```

**验证**：
```bash
# 1. 点击任意图片 → Lightbox 弹出
# 2. 背景半透明黑色遮罩
# 3. 按 ESC → 关闭
# 4. 按 ← → → 切换图片
# 5. 点击背景 → 关闭
# 6. 显示图片信息和序号
```

### Step 7: 错误重试机制 (30 分钟)

**任务**：失败图片显示重试按钮，支持单张和批量重试

**添加重试 Mutation**：`app/src/lib/graphql/mutations.ts`

```typescript
export const RETRY_IMAGE_MUTATION = gql`
  mutation RetryImage($id: ID!) {
    retryImage(id: $id) {
      image {
        id
        status
        fileUrl
        errorMessage
      }
    }
  }
`
```

**更新 ImageCard**：

```typescript
if (image.status === 'failed') {
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
```

**批量重试**：

```typescript
const failedImages = project.images.filter((img) => img.status === 'failed')

{failedImages.length > 0 && (
  <Button
    color="warning"
    onPress={async () => {
      await Promise.all(
        failedImages.map((img) => retryMutation.mutateAsync(img.id))
      )
    }}
  >
    重试全部失败 ({failedImages.length})
  </Button>
)}
```

**验证**：
```bash
# 1. 模拟失败（修改后端返回错误）
# 2. 失败位置显示红色卡片 + 错误信息
# 3. 点击"重试" → 重新生成
# 4. 成功后正常显示
# 5. 多个失败 → "重试全部失败"按钮
```

---

## 🎯 Phase 2 成功标准

完成时应达到：

**功能完备性**：
- ✅ 风格选择器：4+ 风格，高亮反馈，样式正确
- ✅ WebSocket 推送：< 1s 延迟，自动重连，降级轮询
- ✅ 16 张贴纸：9 情绪 + 7 意外，分类清晰
- ✅ Canvas 相框：4 种样式，实时渲染，导出正确
- ✅ ZIP 下载：完整打包，进度显示，结构合理
- ✅ Lightbox：全屏预览，键盘导航，触摸滑动
- ✅ 错误重试：单张/批量，状态更新，用户友好

**性能指标**：
- WebSocket 延迟 < 1s
- Canvas 渲染 16 张 < 2s
- 相框切换 < 300ms
- ZIP 打包 5-10s
- Lightbox 打开动画 300ms
- 所有动画 60fps

**用户体验**：
- 风格选择直观
- 进度更新流畅
- 相框切换即时
- 下载进度清晰
- 预览交互自然
- 错误处理友好

## 💡 快速命令

```bash
# 查看当前状态
cd /home/violet/proj/orange/app
git status

# 启动开发服务器
bun --bun run dev

# 查看 Phase 2 验收标准
grep -A 50 "Phase 2: 完整体验" ../.ctx/ui-acc.md

# 测试 WebSocket 连接
# DevTools → Network → WS → 观察消息

# 验证 ZIP 结构
unzip -l peelpack-xxx.zip

# 检查性能
# DevTools → Performance → 录制相框切换
```

---

## 📚 关键技术参考

- **graphql-ws**：https://the-guild.dev/graphql/ws
- **JSZip**：https://stuk.github.io/jszip/
- **Canvas API**：https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **Hero UI Components**：https://heroui.com/docs/components
- **TanStack Query**：https://tanstack.com/query/latest

---

## ⚠️ 常见问题

**Q: WebSocket 连接失败？**
A: 检查后端是否支持 WS，确认端口正确，查看浏览器控制台错误

**Q: Canvas 渲染慢？**
A: 使用 Intersection Observer 懒加载，避免同时渲染 16 张

**Q: ZIP 下载失败？**
A: 检查图片 URL CORS，确认所有图片都能访问，添加错误处理

**Q: Lightbox 键盘不响应？**
A: 确认事件监听器正确添加/移除，检查焦点陷阱逻辑

---

**预计时间**：5-6 小时（取决于调试时间）
**当前时间**：2025-10-01 23:45

Phase 1 ✅ 完成，开始 Phase 2！🚀
