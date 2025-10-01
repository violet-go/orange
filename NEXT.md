# Phase 3 开发指令 - 精致体验

## 📍 当前状态

✅ **Phase 1 已完成** (commit: cd09d2e, ad91b08)
- TanStack Start + Hero UI 初始化完成
- 首页生成器：文字输入 + 验证 + 加载状态
- 项目详情页：5 秒轮询 + 3×3 网格 + 点击下载
- GraphQL HTTP Client 集成（graphql-request）
- 9 张情绪贴纸生成流程打通

✅ **Phase 2 已完成** (commit: cecc9fe)
- 风格选择器：4 风格卡片 + 响应式布局 + 选中高亮
- WebSocket 实时推送：graphql-ws + < 1s 延迟 + 降级轮询
- 16 张贴纸支持：9 情绪 + 7 意外 + 移动端滚动优化
- Canvas 相框渲染：4 种样式 + 实时切换 + 高 DPI 支持
- ZIP 批量下载：jszip + 进度显示 + 文件夹结构
- Lightbox 预览：全屏查看 + 键盘导航 + 触摸友好
- 错误重试机制：单张/批量重试 + 状态更新

✅ **验收标准：Phase 2 PASS** (7/7)
- 风格选择直观，效果明显 ✅
- 实时进度推送，无明显延迟 ✅
- 16 张贴纸分类清晰（9+7）✅
- 相框渲染流畅，切换即时 ✅
- ZIP 下载完整，结构合理 ✅
- Lightbox 交互流畅，信息完整 ✅
- 失败自动重试，用户可手动重试 ✅

## 🎯 Phase 3 目标

实现**完整的产品体验**：历史管理、快速迭代、高级定制、社交分享、移动优化、用户系统。

**核心升级**：
- 无历史 → 完整的项目管理（列表/筛选/删除）
- 单次生成 → Remix 快速迭代（风格对比/参数继承）
- 固定相框 → 自定义编辑器（颜色/阴影/圆角）
- 本地查看 → 分享传播（链接/二维码/权限）
- 桌面优先 → 移动优化（响应式/触摸/手势）
- 匿名使用 → 用户认证（Better Auth/OAuth）

**验收标准**：完整产品体验，移动端友好，性能优秀（Lighthouse > 90）

---

## 🚀 快速启动步骤

### Step 1: 历史列表页 (90 分钟)

**当前状态**：只能通过 URL 直接访问项目详情

**任务**：实现 `/projects` 历史列表页，支持筛选、排序、快速操作

**实现文件**：`app/src/routes/projects/index.tsx`

```typescript
// app/src/routes/projects/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, Card, CardBody, Chip, Spinner } from '@heroui/react'
import { graphqlClient } from '../../lib/graphql/client'
import { gql } from 'graphql-request'

const GET_PROJECTS_QUERY = gql`
  query GetProjects($limit: Int, $offset: Int, $status: String) {
    projects(limit: $limit, offset: $offset, status: $status) {
      nodeArray {
        id
        inputContent
        status
        createdAt
        style {
          displayName
        }
        images(limit: 1) {
          fileUrl
        }
      }
      totalCount
      hasMore
    }
  }
`

export const Route = createFileRoute('/projects/')({
  component: ProjectListPage,
})

function ProjectListPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')

  const { data, isLoading } = useQuery({
    queryKey: ['projects', statusFilter, sortBy],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_PROJECTS_QUERY, {
        limit: 20,
        offset: 0,
        status: statusFilter,
      })
      return response.projects
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">我的项目</h1>

          {/* Filter and Sort */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex gap-2">
              <Button
                size="sm"
                color={statusFilter === null ? 'primary' : 'default'}
                onPress={() => setStatusFilter(null)}
              >
                全部
              </Button>
              <Button
                size="sm"
                color={statusFilter === 'completed' ? 'primary' : 'default'}
                onPress={() => setStatusFilter('completed')}
              >
                已完成
              </Button>
              <Button
                size="sm"
                color={statusFilter === 'generating' ? 'primary' : 'default'}
                onPress={() => setStatusFilter('generating')}
              >
                生成中
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                color={sortBy === 'newest' ? 'primary' : 'default'}
                onPress={() => setSortBy('newest')}
              >
                最新
              </Button>
              <Button
                size="sm"
                color={sortBy === 'oldest' ? 'primary' : 'default'}
                onPress={() => setSortBy('oldest')}
              >
                最早
              </Button>
            </div>
          </div>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.nodeArray.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onView={() => navigate({ to: `/projects/${project.id}` })}
            />
          ))}
        </div>

        {data?.nodeArray.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">还没有项目</p>
            <Button color="primary" onPress={() => navigate({ to: '/' })}>
              创建第一个项目
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectCard({ project, onView }: any) {
  const statusConfig = {
    completed: { label: '已完成', color: 'success' as const },
    generating: { label: '生成中', color: 'warning' as const },
    failed: { label: '失败', color: 'danger' as const },
    partial_failed: { label: '部分失败', color: 'warning' as const },
  }

  const config = statusConfig[project.status as keyof typeof statusConfig] || {
    label: project.status,
    color: 'default' as const,
  }

  return (
    <Card isPressable onPress={onView} className="hover:shadow-lg transition-shadow">
      <CardBody className="p-0">
        {/* Thumbnail */}
        <div className="aspect-square bg-gray-100 relative">
          {project.images[0]?.fileUrl ? (
            <img
              src={project.images[0].fileUrl}
              alt="thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-4xl">🎨</span>
            </div>
          )}
          <Chip
            color={config.color}
            size="sm"
            className="absolute top-2 right-2"
          >
            {config.label}
          </Chip>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {project.inputContent}
          </p>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{project.style?.displayName || '无风格'}</span>
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
```

**添加导航链接**：`app/src/components/Header.tsx`

```typescript
import { Link } from '@tanstack/react-router'

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex gap-6">
        <Link to="/" className="text-gray-700 hover:text-primary">
          创建
        </Link>
        <Link to="/projects" className="text-gray-700 hover:text-primary">
          我的项目
        </Link>
      </nav>
    </header>
  )
}
```

**验证**：
```bash
# 启动开发服务器
cd app && bun --bun run dev

# 访问 http://localhost:5173/projects
# 1. 应显示所有历史项目（网格布局）
# 2. 筛选器工作正常（全部/已完成/生成中）
# 3. 排序功能正常（最新/最早）
# 4. 点击卡片跳转到详情页
```

### Step 2: Remix 功能 (60 分钟)

**当前状态**：每次生成都是全新的，无法基于已有项目修改

**任务**：实现 Remix 功能，支持参数继承和快速迭代

**添加 Remix 按钮**：`app/src/routes/projects/$id.tsx`

```typescript
// 在项目详情页添加 Remix 按钮
{isCompleted && (
  <div className="mb-8">
    <h1 className="text-2xl font-bold text-green-600 mb-4">
      贴纸包已完成 🎉
    </h1>

    <div className="flex gap-4 mb-4">
      <Button
        color="secondary"
        size="lg"
        onPress={() => {
          navigate({
            to: '/',
            search: {
              remix: id,
              description: project.inputContent,
              styleId: project.style?.id,
            },
          })
        }}
      >
        🔄 Remix 这个项目
      </Button>

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

    {/* ... existing frame selector ... */}
  </div>
)}
```

**更新首页支持 Remix**：`app/src/routes/index.tsx`

```typescript
import { useSearch } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      remix: (search.remix as string) || null,
      description: (search.description as string) || '',
      styleId: (search.styleId as string) || null,
    }
  },
})

function HomePage() {
  const search = useSearch({ from: '/' })
  const [description, setDescription] = useState(search.description || '')
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(
    search.styleId || null
  )
  const navigate = useNavigate()

  const isRemix = !!search.remix

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PeelPack 小贴纸机 🎨
          </h1>
          <p className="text-gray-600">
            {isRemix ? '🔄 基于已有项目重新生成' : '描述你想要的角色，AI 生成专属表情包'}
          </p>
          {isRemix && (
            <Button
              size="sm"
              variant="light"
              onPress={() => {
                navigate({ to: '/', search: {} })
                setDescription('')
                setSelectedStyleId(null)
              }}
            >
              ✕ 取消 Remix
            </Button>
          )}
        </div>

        {/* ... existing form ... */}
      </main>
    </div>
  )
}
```

**后端支持 remixFromId**：需要更新 GraphQL Schema

```graphql
type Project {
  id: ID!
  remixFromId: ID
  remixFrom: Project
  # ... other fields
}

input CreateProjectInput {
  inputType: String!
  inputContent: String!
  styleId: ID
  remixFromId: ID  # 新增
}
```

**验证**：
```bash
# 1. 访问项目详情页
# 2. 点击"Remix 这个项目"
# 3. 跳转到首页，描述和风格已预填充
# 4. 修改描述或风格后生成
# 5. 新项目应记录 remixFromId
```

### Step 3: 相框编辑器增强 (60 分钟)

**当前状态**：只有 4 种固定相框样式

**任务**：添加自定义参数（边框宽度、颜色、阴影、圆角）

**创建增强版相框编辑器**：`app/src/components/AdvancedFrameEditor.tsx`

```typescript
import { useState } from 'react'
import { Button, Slider } from '@heroui/react'

interface FrameConfig {
  style: 'none' | 'custom'
  borderWidth: number
  borderColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  shadowColor: string
  borderRadius: number
}

interface AdvancedFrameEditorProps {
  config: FrameConfig
  onChange: (config: FrameConfig) => void
}

export function AdvancedFrameEditor({ config, onChange }: AdvancedFrameEditorProps) {
  const presetColors = [
    '#ffffff', '#000000', '#f3f4f6', '#ffc0cb', '#87ceeb',
    '#ffd700', '#ff6b6b', '#4ecdc4', '#95e1d3',
  ]

  return (
    <div className="space-y-6 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">自定义相框</h3>

      {/* Border Width */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          边框宽度：{config.borderWidth}px
        </label>
        <Slider
          size="sm"
          step={1}
          minValue={0}
          maxValue={50}
          value={config.borderWidth}
          onChange={(value) =>
            onChange({ ...config, borderWidth: value as number })
          }
          className="max-w-full"
        />
        <div className="flex gap-2 mt-2">
          {[10, 20, 30].map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant="flat"
              onPress={() => onChange({ ...config, borderWidth: preset })}
            >
              {preset}px
            </Button>
          ))}
        </div>
      </div>

      {/* Border Color */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          边框颜色
        </label>
        <div className="flex gap-2 flex-wrap">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ ...config, borderColor: color })}
              className={`w-8 h-8 rounded border-2 ${
                config.borderColor === color
                  ? 'border-primary ring-2 ring-primary'
                  : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <input
          type="color"
          value={config.borderColor}
          onChange={(e) => onChange({ ...config, borderColor: e.target.value })}
          className="mt-2 w-full h-10 rounded cursor-pointer"
        />
      </div>

      {/* Shadow Blur */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          阴影模糊：{config.shadowBlur}px
        </label>
        <Slider
          size="sm"
          step={1}
          minValue={0}
          maxValue={30}
          value={config.shadowBlur}
          onChange={(value) =>
            onChange({ ...config, shadowBlur: value as number })
          }
        />
      </div>

      {/* Border Radius */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          圆角：{config.borderRadius}px
        </label>
        <Slider
          size="sm"
          step={1}
          minValue={0}
          maxValue={50}
          value={config.borderRadius}
          onChange={(value) =>
            onChange({ ...config, borderRadius: value as number })
          }
        />
      </div>

      {/* Reset Button */}
      <Button
        size="sm"
        variant="flat"
        onPress={() =>
          onChange({
            style: 'none',
            borderWidth: 20,
            borderColor: '#ffffff',
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 4,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 0,
          })
        }
      >
        重置默认
      </Button>
    </div>
  )
}
```

**集成到项目详情页**：

```typescript
const [frameConfig, setFrameConfig] = useState<FrameConfig>({
  style: 'none',
  borderWidth: 20,
  borderColor: '#ffffff',
  shadowBlur: 10,
  shadowOffsetX: 0,
  shadowOffsetY: 4,
  shadowColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: 0,
})

// 在完成状态下显示编辑器
{isCompleted && (
  <div className="mb-8">
    <AdvancedFrameEditor config={frameConfig} onChange={setFrameConfig} />
  </div>
)}

// 更新 Canvas 渲染逻辑使用 frameConfig
```

**验证**：
```bash
# 1. 生成完成后，调整各种参数
# 2. 实时预览应流畅更新（< 300ms）
# 3. 边框颜色、宽度、阴影、圆角都能生效
# 4. 重置按钮恢复默认值
```

### Step 4: 分享功能 (45 分钟)

**当前状态**：只能本地查看，无法分享给他人

**任务**：生成分享链接，支持二维码和权限控制

**添加分享按钮**：`app/src/routes/projects/$id.tsx`

```typescript
import { useState } from 'react'
import { Button, Modal, ModalContent, ModalBody } from '@heroui/react'
import QRCode from 'qrcode'

function ProjectDetailPage() {
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  const handleShare = async () => {
    const url = `${window.location.origin}/share/${id}`
    setShareUrl(url)

    // Generate QR code
    const qr = await QRCode.toDataURL(url)
    setQrCodeUrl(qr)

    setShowShareModal(true)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('链接已复制！')
  }

  return (
    <>
      {/* ... existing code ... */}

      {isCompleted && (
        <Button
          color="secondary"
          size="lg"
          onPress={handleShare}
        >
          🔗 分享
        </Button>
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
    </>
  )
}
```

**安装依赖**：
```bash
cd app
bun add qrcode
bun add -d @types/qrcode
```

**创建分享页面**：`app/src/routes/share/$id.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, CardBody, Spinner } from '@heroui/react'
import { graphqlClient } from '../../lib/graphql/client'
import { GET_PROJECT_QUERY } from '../../lib/graphql/queries'

export const Route = createFileRoute('/share/$id')({
  component: SharePage,
})

function SharePage() {
  const { id } = Route.useParams()

  const { data: project, isLoading } = useQuery({
    queryKey: ['share-project', id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_PROJECT_QUERY, { id })
      return response.project
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardBody>
            <p className="text-gray-500">项目不存在或已被删除</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">PeelPack 作品分享</h1>
          <p className="text-gray-600">{project.inputContent}</p>
          <Button
            color="primary"
            size="lg"
            className="mt-4"
            onPress={() => window.location.href = '/'}
          >
            🎨 我也要生成
          </Button>
        </div>

        {/* Display images (read-only) */}
        <div className="grid grid-cols-3 gap-4">
          {project.images
            .filter((img: any) => img.status === 'success')
            .map((image: any) => (
              <Card key={image.id}>
                <CardBody className="p-0">
                  <img
                    src={image.fileUrl}
                    alt={image.emotionType}
                    className="w-full aspect-square object-cover"
                  />
                </CardBody>
              </Card>
            ))}
        </div>
      </main>
    </div>
  )
}
```

**验证**：
```bash
# 1. 点击"分享"按钮
# 2. 弹出模态框，显示二维码和链接
# 3. 点击"复制链接"，链接被复制
# 4. 在隐私窗口打开分享链接
# 5. 应显示只读的项目详情
```

### Step 5: 移动端优化 (45 分钟)

**当前状态**：桌面端体验良好，移动端需优化

**任务**：优化移动端布局、触摸手势、性能

**更新全局样式**：`app/src/styles.css`

```css
/* Mobile-first responsive design */
@media (max-width: 768px) {
  /* Header optimization */
  header nav {
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Card grid optimization */
  .project-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  /* Button sizing for touch */
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }

  /* Lightbox mobile optimization */
  .lightbox-image {
    max-width: 95vw;
    max-height: 80vh;
  }

  /* Form inputs */
  input, textarea, select {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}

/* Touch gestures */
.swipeable {
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
}

/* Performance optimizations */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}
```

**添加触摸手势支持**：`app/src/components/ImageLightbox.tsx`

```typescript
import { useEffect, useState, useRef } from 'react'

export function ImageLightbox({ imageArray, selectedId, onClose }: ImageLightboxProps) {
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ... existing code ... */}
    </div>
  )
}
```

**验证**：
```bash
# 真机测试
1. 使用 ngrok 暴露本地服务
   ngrok http 5173

2. 在手机浏览器访问 ngrok URL

3. 测试要点：
   - 输入框自动聚焦无缩放
   - 按钮大小 ≥ 44x44px
   - 触摸滑动切换图片流畅
   - 九宫格布局正确
   - 意外表情横向滚动顺畅
```

### Step 6: 用户认证 (120 分钟) - 可选

**当前状态**：匿名使用，无用户系统

**任务**：集成 Better Auth，支持邮箱和 OAuth 登录

**安装 Better Auth**：
```bash
cd app
bun add better-auth
```

**配置 Better Auth**：`app/src/lib/auth.ts`

```typescript
import { createAuth } from 'better-auth'

export const auth = createAuth({
  database: {
    provider: 'sqlite',
    url: process.env.DATABASE_URL || 'file:./data/auth.db',
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
})
```

**创建登录页面**：`app/src/routes/auth/login.tsx`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Input, Card, CardBody } from '@heroui/react'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    // Implement login logic
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="max-w-md w-full">
        <CardBody className="p-8">
          <h1 className="text-2xl font-bold mb-6">登录</h1>

          <div className="space-y-4">
            <Input
              type="email"
              label="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              label="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              color="primary"
              className="w-full"
              onPress={handleLogin}
            >
              登录
            </Button>

            <div className="flex gap-2">
              <Button
                variant="flat"
                className="flex-1"
                onPress={() => {/* Google OAuth */}}
              >
                Google
              </Button>
              <Button
                variant="flat"
                className="flex-1"
                onPress={() => {/* GitHub OAuth */}}
              >
                GitHub
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
```

**注意**：用户认证需要后端配合，可暂时跳过

---

## 🎯 Phase 3 成功标准

完成时应达到：

**功能完备性**：
- ✅ 历史列表：网格布局、筛选、排序、快速操作
- ✅ Remix 功能：参数继承、快速迭代、链条追溯
- ✅ 相框编辑：自定义颜色、宽度、阴影、圆角
- ✅ 分享功能：链接生成、二维码、只读页面
- ✅ 移动优化：响应式布局、触摸手势、性能优化
- ⭕ 用户认证：登录/注册、OAuth、权限保护（可选）

**性能指标**：
- 首页 FCP < 1.5s
- 首页 LCP < 2.5s
- TTI < 3s
- CLS < 0.1
- Lighthouse 分数 > 90
- 移动端性能分数 > 80

**用户体验**：
- 历史管理便捷
- Remix 流程顺畅
- 相框可定制
- 分享功能完善
- 移动端体验优秀
- 所有页面响应式（375px - 1920px）

## 💡 快速命令

```bash
# 查看当前状态
cd /home/violet/proj/orange/app
git status

# 启动开发服务器
bun --bun run dev

# 查看 Phase 3 验收标准
grep -A 50 "Phase 3: 精致体验" ../.ctx/ui-acc.md

# 移动端测试（使用 ngrok）
ngrok http 5173

# 检查性能
# DevTools → Lighthouse → 运行分析
```

---

## 📚 关键技术参考

- **Better Auth**：https://better-auth.com/docs
- **QRCode**：https://github.com/soldair/node-qrcode
- **TanStack Router Search Params**：https://tanstack.com/router/latest/docs/framework/react/guide/search-params
- **Mobile Web Best Practices**：https://web.dev/mobile/
- **Touch Events**：https://developer.mozilla.org/en-US/docs/Web/API/Touch_events

---

## ⚠️ 常见问题

**Q: 历史列表加载慢？**
A: 实现分页或无限滚动，每页限制 20 个项目

**Q: Remix 参数丢失？**
A: 检查 URL search params 是否正确传递和解析

**Q: 移动端输入框缩放？**
A: 设置 input font-size: 16px 防止 iOS 自动缩放

**Q: 分享页面无权限控制？**
A: Phase 3 暂时公开，权限控制留待用户认证后实现

---

**预计时间**：6-8 小时（不含用户认证）
**当前时间**：2025-10-01 23:55

Phase 2 ✅ 完成，开始 Phase 3！🚀
