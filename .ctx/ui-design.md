# PeelPack 前端 UI 设计文档

## UI 架构概述

PeelPack 前端是一个单页应用（SPA），采用 TanStack Start 作为应用框架，底层使用 Vite 构建。核心设计理念是"极简交互、实时反馈、渐进增强"——用户只需三步完成贴纸生成（输入描述 → 选择风格 → 等待结果），生成过程通过 GraphQL Subscription 实时推送进度，UI 根据网络状况自动降级到轮询模式。

整个应用的状态管理依赖 TanStack Query，不引入额外的状态管理库（Zustand/Jotai）。GraphQL 数据通过 TanStack Query 缓存，组件状态通过 React 原生 hooks 管理，全局状态通过 URL 参数传递（如当前项目 ID）。这种设计避免了状态同步问题，保持了数据流的单向性。

UI 组件采用原子设计方法论，但不强求严格分层。原子组件（Button/Input/Card）手写实现，不依赖 UI 组件库；复合组件（StylePicker/ProgressMonitor/ResultView）组合原子组件；页面组件（GeneratorPage/ProjectPage）组合复合组件并处理路由逻辑。这种渐进式的组件化策略在保持灵活性的同时避免了过度抽象。

## 页面结构设计

### 文件路由映射

```
app/routes/
├── index.tsx              # 首页 = 生成器入口
├── projects/
│   └── $id.tsx            # 项目详情 = 进度监听 + 结果展示
└── login.tsx              # 认证页面（MVP 可选）
```

MVP 阶段只需要两个核心页面：首页用于输入和触发生成，项目详情页用于监听进度和展示结果。认证页面在 MVP 阶段可以跳过，所有项目属于匿名用户或使用固定的测试用户 ID。

历史列表页面（`projects/index.tsx`）在 MVP 阶段不实现，因为用户刷新页面后可以通过浏览器历史记录返回之前的项目详情页。这符合 YAGNI 原则——第一版不需要复杂的项目管理，聚焦核心生成流程。

### 页面组件层次

**首页（`/`）**：

```tsx
<GeneratorPage>
  <Header>
    <Logo />
    <UserMenu />  {/* MVP: 可省略 */}
  </Header>

  <GeneratorForm>
    <InputSelector>
      <TextInput />        {/* MVP: 只实现这个 */}
      <ImageUpload />      {/* Phase 2 */}
      <MixedInput />       {/* Phase 2 */}
    </InputSelector>

    <StylePicker>
      <StyleCard />        {/* 可复用组件 */}
      <StyleCard />
      <StyleCard />
      ...
    </StylePicker>

    <GenerateButton />
  </GeneratorForm>

  <Footer />
</GeneratorPage>
```

**项目详情页（`/projects/$id`）**：

```tsx
<ProjectPage>
  <Header />

  {/* 根据项目状态条件渲染 */}
  {status === 'generating' && (
    <ProgressView>
      <ProgressBar progress={current/total} />
      <StatusText>正在生成第 {current}/{total} 张...</StatusText>
      <ImageGrid>
        {/* 已完成的图片实时显示 */}
        <ImageCard status="success" />
        <ImageCard status="success" />
        <ImageCard status="generating" />  {/* 骨架屏 */}
        <ImageCard status="pending" />     {/* 占位符 */}
      </ImageGrid>
    </ProgressView>
  )}

  {(status === 'completed' || status === 'partial_failed') && (
    <ResultView>
      <ActionBar>
        <DownloadButton />
        <RemixButton />    {/* Phase 2 */}
        <ShareButton />    {/* Phase 3 */}
      </ActionBar>

      <EmotionGrid>
        {/* 3x3 九宫格情绪 */}
        <EmotionCard emotion="happy" />
        <EmotionCard emotion="sad" />
        <EmotionCard emotion="angry" />
        {/* ... 共 9 张 */}
      </EmotionGrid>

      <SurpriseRow>
        {/* 1x7 意外表情 - Phase 2 */}
        <SurpriseCard index={0} />
        {/* ... 共 7 张 */}
      </SurpriseRow>

      {/* 相框编辑器 - Phase 2 */}
      <FrameEditor />
    </ResultView>
  )}

  <Footer />
</ProjectPage>
```

## 核心页面详细设计

### 首页 - 生成器入口

**设计目标**：让用户在 30 秒内完成输入并触发生成，无需阅读说明文档。

**布局结构**：

```
┌─────────────────────────────────────┐
│  [Logo] PeelPack    小贴纸机        │  ← Header 固定高度 64px
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 描述你想要的贴纸：            │  │
│  │ ┌───────────────────────────┐ │  │
│  │ │ 一只可爱的橘猫            │ │  │  ← Textarea 自动高度
│  │ └───────────────────────────┘ │  │
│  │                               │  │
│  │ 提示：描述角色外观、风格      │  │
│  └───────────────────────────────┘  │
│                                     │
│  选择风格：                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │动漫│ │写实│ │Q版 │ │像素│      │  ← 风格卡片网格
│  └────┘ └────┘ └────┘ └────┘      │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │水彩│ │油画│ │素描│ │无  │      │
│  └────┘ └────┘ └────┘ └────┘      │
│                                     │
│       ┌─────────────────┐           │
│       │ 生成贴纸包 🎨   │           │  ← CTA 按钮 48px 高
│       └─────────────────┘           │
│                                     │
└─────────────────────────────────────┘
```

**交互细节**：

1. **输入框焦点管理**：页面加载后自动聚焦到文字输入框，用户可以立即开始输入，无需点击。
2. **风格选择反馈**：点击风格卡片时，卡片边框高亮（从 2px gray 变为 4px primary），同时播放轻微的缩放动画（scale 1.0 → 1.05 → 1.0）。
3. **按钮状态**：生成按钮在输入为空时禁用（灰色不可点击），输入有内容后启用（渐变色可点击）。点击后立即禁用并显示 loading 状态（按钮文字变为"生成中..."，添加旋转图标）。
4. **错误处理**：如果 GraphQL Mutation 失败（网络错误或后端错误），在输入框下方显示错误提示（红色背景，白色文字），3 秒后自动消失。按钮恢复可点击状态。

**技术实现**：

```tsx
// app/routes/index.tsx
export default function GeneratorPage() {
  const [description, setDescription] = useState('')
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null)
  const navigate = useNavigate()

  // TanStack Query Mutation
  const createProject = useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const response = await graphqlClient.request(CREATE_PROJECT_MUTATION, { input })
      return response.createProject
    },
    onSuccess: (data) => {
      // 立即跳转到项目详情页
      navigate(`/projects/${data.project.id}`)
    },
    onError: (error) => {
      toast.error('生成失败，请重试')
    }
  })

  const handleGenerate = () => {
    createProject.mutate({
      inputType: 'TEXT',
      inputContent: description,
      styleId: selectedStyleId,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-12">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-4">描述你想要的贴纸：</h2>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例如：一只可爱的橘猫，大眼睛，圆脸"
            className="mb-2"
            autoFocus
          />

          <p className="text-sm text-gray-500 mb-6">
            提示：描述角色的外观、性格、风格
          </p>

          <h3 className="text-lg font-semibold mb-4">选择风格：</h3>

          <StylePicker
            selectedId={selectedStyleId}
            onSelect={setSelectedStyleId}
          />

          <Button
            onClick={handleGenerate}
            disabled={!description.trim() || createProject.isPending}
            className="w-full mt-8"
            size="lg"
          >
            {createProject.isPending ? '生成中...' : '生成贴纸包 🎨'}
          </Button>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
```

### 项目详情页 - 进度监听 + 结果展示

**设计目标**：实时展示生成进度，让等待过程变得有趣而非焦虑；结果展示清晰直观，用户一眼看到所有生成的贴纸。

**进度视图（status = 'generating'）**：

```
┌─────────────────────────────────────┐
│  [← 返回]  正在生成贴纸包...        │
├─────────────────────────────────────┤
│                                     │
│  ●●●●●●●●●○○○○○○○  9/16 张完成     │  ← 进度条 + 数字
│                                     │
│  预计剩余时间：约 45 秒              │  ← 动态估算
│                                     │
│  九宫格情绪表情：                   │
│  ┌─────┬─────┬─────┐                │
│  │ 😊  │ 😢  │ 😠  │  ← 已完成显示  │
│  │     │     │     │     图片       │
│  ├─────┼─────┼─────┤                │
│  │ 😮  │ 🤔  │ 😳  │                │
│  │     │     │     │                │
│  ├─────┼─────┼─────┤                │
│  │ 🔄  │ ⏳  │ ⏳  │  ← 生成中/等待 │
│  │     │     │     │                │
│  └─────┴─────┴─────┘                │
│                                     │
│  意外表情：                         │
│  ┌───┬───┬───┬───┬───┬───┬───┐    │
│  │ ⏳│ ⏳│ ⏳│ ⏳│ ⏳│ ⏳│ ⏳│    │
│  └───┴───┴───┴───┴───┴───┴───┘    │
│                                     │
└─────────────────────────────────────┘
```

**结果视图（status = 'completed' | 'partial_failed'）**：

```
┌─────────────────────────────────────┐
│  [← 返回]  贴纸包已完成 🎉          │
├─────────────────────────────────────┤
│                                     │
│  [下载全部 ZIP]  [Remix]  [分享]   │  ← 操作栏
│                                     │
│  九宫格情绪表情：                   │
│  ┌──────┬──────┬──────┐             │
│  │      │      │      │             │
│  │  😊  │  😢  │  😠  │  ← 高清图片 │
│  │ 开心 │ 难过 │ 生气 │  + 标签     │
│  └──────┴──────┴──────┘             │
│  ┌──────┬──────┬──────┐             │
│  │  😮  │  🤔  │  😳  │             │
│  │ 惊讶 │ 思考 │ 害羞 │             │
│  └──────┴──────┴──────┘             │
│  ┌──────┬──────┬──────┐             │
│  │  😎  │  😴  │  ❤️  │             │
│  │ 骄傲 │ 疲倦 │ 爱心 │             │
│  └──────┴──────┴──────┘             │
│                                     │
│  意外表情：                         │
│  [👋] [👍] [🍕] [📖] [🎧] [💤] [💻]│
│                                     │
│  相框选择：                         │  ← Phase 2
│  ○ 无边框  ● 白色描边  ○ 圆角      │
│                                     │
└─────────────────────────────────────┘
```

**交互细节**：

1. **Subscription 实时更新**：前端订阅 `projectProgress` Subscription，每当后端完成一张图片，立即推送更新。前端收到更新后，将对应位置的占位符替换为实际图片，播放淡入动画（opacity 0 → 1，duration 300ms）。

2. **进度估算**：根据已完成图片的平均生成时间，动态估算剩余时间。公式：`remainingTime = (totalCount - currentCount) * avgTimePerImage`。每完成一张图片重新计算平均时间，让估算越来越准确。

3. **失败重试**：如果某张图片生成失败，在对应位置显示"重试"按钮（红色背景，白色图标）。用户点击后触发 `retryImage` Mutation，重新生成该图片。

4. **图片预览**：点击任意图片弹出全屏预览（Lightbox），支持左右箭头切换，按 ESC 关闭。预览时显示该图片的 Prompt 和生成参数（seed、风格等）。

5. **下载交互**：点击"下载全部"按钮后，按钮文字变为"打包中..."，禁用状态。前端并发下载所有图片，打包成 ZIP，触发浏览器下载。整个过程显示打包进度（"正在下载图片 5/16..."）。

**技术实现**：

```tsx
// app/routes/projects/$id.tsx
export default function ProjectPage() {
  const { id } = useParams()

  // 1. Query - 获取项目初始状态
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_PROJECT_QUERY, { id })
      return response.project
    },
    refetchInterval: (data) => {
      // 如果状态是 generating，每 5 秒轮询一次（降级方案）
      return data?.status === 'generating' ? 5000 : false
    }
  })

  // 2. Subscription - 实时进度更新
  const { data: progressUpdate } = useSubscription({
    query: PROJECT_PROGRESS_SUBSCRIPTION,
    variables: { projectId: id },
    enabled: project?.status === 'generating', // 只在生成中时订阅
    onData: (data) => {
      // 更新 TanStack Query 缓存
      queryClient.setQueryData(['project', id], (old) => ({
        ...old,
        status: data.status,
        images: data.latestImage
          ? updateImageInArray(old.images, data.latestImage)
          : old.images
      }))
    }
  })

  if (isLoading) return <LoadingSpinner />
  if (!project) return <NotFound />

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {project.status === 'generating' && (
          <ProgressView
            project={project}
            progress={progressUpdate?.progress}
          />
        )}

        {(project.status === 'completed' || project.status === 'partial_failed') && (
          <ResultView project={project} />
        )}
      </main>

      <Footer />
    </div>
  )
}
```

## 原子组件设计

### Button 组件

**设计原则**：支持多种 variant（primary/secondary/ghost）、多种 size（sm/md/lg）、多种状态（default/loading/disabled）。

```tsx
// components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 active:scale-95',
    secondary: 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 active:scale-95',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 active:scale-95'
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner className="mr-2" />}
      {children}
    </button>
  )
}
```

### Card 组件

**设计原则**：统一的卡片容器，支持 hover 效果、点击效果、加载状态。

```tsx
// components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  clickable?: boolean
  onClick?: () => void
}

export function Card({
  children,
  className,
  hoverable = false,
  clickable = false,
  onClick
}: CardProps) {
  const baseStyles = 'bg-white rounded-xl shadow-sm border border-gray-200'
  const hoverStyles = hoverable ? 'hover:shadow-md transition-shadow duration-200' : ''
  const clickStyles = clickable ? 'cursor-pointer active:scale-98' : ''

  return (
    <div
      className={cn(baseStyles, hoverStyles, clickStyles, className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
```

### ImageCard 组件

**设计原则**：展示单张贴纸图片，支持多种状态（pending/generating/success/failed），支持点击预览、下载单张。

```tsx
// components/ImageCard.tsx
interface ImageCardProps {
  image: Image
  showLabel?: boolean
  onPreview?: () => void
  onRetry?: () => void
}

export function ImageCard({ image, showLabel = true, onPreview, onRetry }: ImageCardProps) {
  if (image.status === 'pending') {
    return (
      <Card className="aspect-square flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">
          <ClockIcon className="w-8 h-8" />
        </div>
      </Card>
    )
  }

  if (image.status === 'generating') {
    return (
      <Card className="aspect-square flex items-center justify-center bg-gray-50">
        <Spinner className="w-8 h-8 text-purple-500" />
      </Card>
    )
  }

  if (image.status === 'failed') {
    return (
      <Card className="aspect-square flex items-center justify-center bg-red-50 border-red-200">
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshIcon className="w-4 h-4 mr-1" />
          重试
        </Button>
      </Card>
    )
  }

  // status === 'success'
  return (
    <Card
      hoverable
      clickable
      onClick={onPreview}
      className="aspect-square overflow-hidden group"
    >
      <img
        src={image.fileUrl}
        alt={image.emotionType || `surprise-${image.surpriseIndex}`}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {showLabel && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <p className="text-white text-sm font-medium text-center">
            {getEmotionLabel(image.emotionType)}
          </p>
        </div>
      )}
    </Card>
  )
}
```

### StyleCard 组件

**设计原则**：展示风格预设，支持缩略图、标题、描述、选中状态。

```tsx
// components/StyleCard.tsx
interface StyleCardProps {
  style: Style
  isSelected: boolean
  onSelect: () => void
}

export function StyleCard({ style, isSelected, onSelect }: StyleCardProps) {
  return (
    <Card
      clickable
      onClick={onSelect}
      className={cn(
        'p-4 transition-all duration-200',
        isSelected
          ? 'border-4 border-purple-500 shadow-lg'
          : 'border-2 border-gray-200 hover:border-gray-300'
      )}
    >
      {style.thumbnailUrl && (
        <img
          src={style.thumbnailUrl}
          alt={style.displayName}
          className="w-full aspect-square object-cover rounded-lg mb-3"
        />
      )}

      <h3 className="font-semibold text-gray-900 mb-1">
        {style.displayName}
      </h3>

      <p className="text-sm text-gray-500 line-clamp-2">
        {style.description}
      </p>

      {isSelected && (
        <div className="mt-2 flex items-center text-purple-500">
          <CheckIcon className="w-4 h-4 mr-1" />
          <span className="text-xs font-medium">已选择</span>
        </div>
      )}
    </Card>
  )
}
```

## 复合组件设计

### StylePicker 组件

**功能**：展示所有可用风格，支持选择、搜索（Phase 2）、自定义 Prompt（Phase 2）。

```tsx
// components/StylePicker.tsx
interface StylePickerProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function StylePicker({ selectedId, onSelect }: StylePickerProps) {
  // Query - 获取所有可用风格
  const { data: styles, isLoading } = useQuery({
    queryKey: ['styles'],
    queryFn: async () => {
      const response = await graphqlClient.request(GET_STYLES_QUERY)
      return response.styles
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
  })

  if (isLoading) return <div className="grid grid-cols-4 gap-4">
    {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square" />)}
  </div>

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 无风格选项 */}
      <StyleCard
        style={{
          id: null,
          displayName: '无',
          description: '不使用预设风格',
          thumbnailUrl: null
        }}
        isSelected={selectedId === null}
        onSelect={() => onSelect(null)}
      />

      {/* 预设风格 */}
      {styles?.map((style) => (
        <StyleCard
          key={style.id}
          style={style}
          isSelected={selectedId === style.id}
          onSelect={() => onSelect(style.id)}
        />
      ))}
    </div>
  )
}
```

### ProgressMonitor 组件

**功能**：监听 Subscription 实时更新，展示进度条、剩余时间、已完成图片。

```tsx
// components/ProgressMonitor.tsx
interface ProgressMonitorProps {
  project: Project
  progress?: JobProgress
}

export function ProgressMonitor({ project, progress }: ProgressMonitorProps) {
  const [avgTimePerImage, setAvgTimePerImage] = useState(5) // 默认 5 秒/张
  const [startTime] = useState(Date.now())

  // 计算进度
  const current = progress?.current || 0
  const total = project.images.length
  const percentage = (current / total) * 100

  // 动态估算剩余时间
  useEffect(() => {
    if (current > 0) {
      const elapsed = (Date.now() - startTime) / 1000 // 秒
      const avg = elapsed / current
      setAvgTimePerImage(avg)
    }
  }, [current, startTime])

  const remainingTime = Math.ceil((total - current) * avgTimePerImage)

  return (
    <div className="space-y-6">
      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>正在生成贴纸包...</span>
          <span className="font-medium">{current}/{total} 张完成</span>
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-sm text-gray-500 text-center">
          预计剩余时间：约 {remainingTime} 秒
        </p>
      </div>

      {/* 图片网格 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">九宫格情绪表情：</h3>
        <div className="grid grid-cols-3 gap-4">
          {project.images
            .filter(img => img.category === 'emotion')
            .map(image => (
              <ImageCard key={image.id} image={image} showLabel={false} />
            ))
          }
        </div>

        {/* Phase 2: 意外表情 */}
        {project.images.some(img => img.category === 'surprise') && (
          <>
            <h3 className="text-lg font-semibold mt-8">意外表情：</h3>
            <div className="grid grid-cols-7 gap-2">
              {project.images
                .filter(img => img.category === 'surprise')
                .map(image => (
                  <ImageCard key={image.id} image={image} showLabel={false} />
                ))
              }
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

### ResultView 组件

**功能**：展示生成结果，支持下载、Remix、分享、相框编辑。

```tsx
// components/ResultView.tsx
interface ResultViewProps {
  project: Project
}

export function ResultView({ project }: ResultViewProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

  // 下载所有图片为 ZIP
  const handleDownloadAll = async () => {
    setIsDownloading(true)
    try {
      const images = project.images.filter(img => img.status === 'success')

      // 并发下载所有图片
      const blobs = await Promise.all(
        images.map(async (img) => {
          const response = await fetch(img.fileUrl)
          return {
            name: getImageFileName(img), // 如 "emotion-happy.png"
            blob: await response.blob()
          }
        })
      )

      // 打包成 ZIP
      const zip = new JSZip()
      blobs.forEach(({ name, blob }) => {
        zip.file(name, blob)
      })

      // 生成 ZIP 并触发下载
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `peelpack-${project.id}.zip`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('下载成功！')
    } catch (error) {
      toast.error('下载失败，请重试')
    } finally {
      setIsDownloading(false)
    }
  }

  const emotionImages = project.images.filter(img => img.category === 'emotion')
  const surpriseImages = project.images.filter(img => img.category === 'surprise')

  return (
    <div className="space-y-8">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          贴纸包已完成 🎉
        </h1>

        <div className="flex gap-3">
          <Button
            onClick={handleDownloadAll}
            isLoading={isDownloading}
            size="lg"
          >
            <DownloadIcon className="w-5 h-5 mr-2" />
            下载全部
          </Button>

          {/* Phase 2 */}
          <Button variant="secondary" size="lg">
            <RefreshIcon className="w-5 h-5 mr-2" />
            Remix
          </Button>
        </div>
      </div>

      {/* 九宫格情绪 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">九宫格情绪表情：</h2>
        <div className="grid grid-cols-3 gap-4">
          {emotionImages.map(image => (
            <ImageCard
              key={image.id}
              image={image}
              showLabel={true}
              onPreview={() => setSelectedImageId(image.id)}
            />
          ))}
        </div>
      </div>

      {/* 意外表情 - Phase 2 */}
      {surpriseImages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">意外表情：</h2>
          <div className="grid grid-cols-7 gap-3">
            {surpriseImages.map(image => (
              <ImageCard
                key={image.id}
                image={image}
                showLabel={false}
                onPreview={() => setSelectedImageId(image.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 图片预览 Lightbox */}
      {selectedImageId && (
        <ImageLightbox
          images={project.images.filter(img => img.status === 'success')}
          selectedId={selectedImageId}
          onClose={() => setSelectedImageId(null)}
        />
      )}
    </div>
  )
}
```

## 交互流程设计

### 完整用户旅程

```
1. 用户访问首页 (/)
   ↓
2. 输入描述文字（自动聚焦）
   ↓
3. 选择风格（点击卡片高亮）
   ↓
4. 点击"生成"按钮
   ↓ GraphQL Mutation: createProject
   ↓ 返回 project.id
   ↓
5. 跳转到 /projects/:id
   ↓ GraphQL Query: getProject（获取初始状态）
   ↓ GraphQL Subscription: projectProgress（订阅更新）
   ↓
6. 展示进度条 + 骨架屏
   ↓ 后端每完成一张图片推送更新
   ↓ 前端实时更新 UI（淡入动画）
   ↓
7. 所有图片生成完成
   ↓ 切换到结果视图
   ↓
8. 用户浏览、预览、下载
   ↓
9. 可选：点击 Remix 回到首页（携带参数）
```

### 状态转换图

```
Project Status:
  pending ──┐
            ├──→ generating ──┐
  (创建后)  │                 ├──→ completed（全部成功）
            │                 │
            │                 └──→ partial_failed（部分失败）
            │
            └──→ failed（Phase 2: 全部失败）

Image Status:
  pending ──→ generating ──┬──→ success
                           │
                           └──→ failed ──→ (retry) ──→ generating
```

### 错误处理流程

**网络错误**：
```
用户点击生成按钮
  ↓ Mutation 失败（网络断开）
  ↓
显示 Toast 错误提示
  ↓
按钮恢复可点击状态
  ↓
用户可以重试
```

**部分生成失败**：
```
16 张图片中有 2 张失败
  ↓
Project 状态变为 partial_failed
  ↓
结果视图正常展示 14 张成功的图片
  ↓
失败的 2 张显示"重试"按钮
  ↓
用户可以单独重试失败的图片
```

**Subscription 断线**：
```
WebSocket 连接断开
  ↓
useSubscription hook 自动重连（3 次）
  ↓
如果重连失败，降级到轮询模式
  ↓ Query refetchInterval: 5s
  ↓
每 5 秒轮询一次项目状态
  ↓
用户依然能看到进度更新（延迟 5s）
```

## 视觉设计系统

### 色彩方案

**主色调**：
```css
/* 紫粉渐变 - 体现"小贴纸机"的活泼可爱 */
--primary-gradient: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
--primary-purple: #9333ea;
--primary-pink: #ec4899;

/* 中性色 */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-500: #6b7280;
--gray-700: #374151;
--gray-900: #111827;

/* 状态色 */
--success-green: #10b981;
--error-red: #ef4444;
--warning-yellow: #f59e0b;
```

**使用规则**：
- 主要 CTA 按钮：紫粉渐变
- 次要按钮：白底灰边
- 背景：淡紫到淡粉渐变（from-purple-50 to-pink-50）
- 卡片：纯白 + 细灰边
- 文字：标题 gray-900，正文 gray-700，提示 gray-500

### 字体系统

```css
/* 字体族 */
font-family:
  'Inter', /* 英文 */
  'Noto Sans SC', /* 中文 */
  system-ui,
  -apple-system,
  sans-serif;

/* 字重 */
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* 字号 */
--text-xs: 0.75rem;    /* 12px - 辅助信息 */
--text-sm: 0.875rem;   /* 14px - 次要文字 */
--text-base: 1rem;     /* 16px - 正文 */
--text-lg: 1.125rem;   /* 18px - 小标题 */
--text-xl: 1.25rem;    /* 20px - 卡片标题 */
--text-2xl: 1.5rem;    /* 24px - 页面标题 */
--text-3xl: 1.875rem;  /* 30px - 大标题 */
```

### 间距系统

采用 Tailwind 的 4px 基准网格：

```css
/* Tailwind spacing scale */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

**使用规则**：
- 组件内部间距：space-2 / space-3
- 组件之间间距：space-4 / space-6
- 区块之间间距：space-8 / space-12
- 页面边距：space-4（移动端）/ space-8（桌面端）

### 圆角系统

```css
--radius-sm: 0.25rem;   /* 4px - 小按钮 */
--radius-md: 0.5rem;    /* 8px - 按钮、输入框 */
--radius-lg: 0.75rem;   /* 12px - 卡片 */
--radius-xl: 1rem;      /* 16px - 大卡片 */
--radius-full: 9999px;  /* 圆形 */
```

### 阴影系统

```css
/* Tailwind shadow scale */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

**使用规则**：
- 静态卡片：shadow-sm
- Hover 卡片：shadow-md
- Modal/Dropdown：shadow-lg

### 动画系统

```css
/* 过渡时长 */
--duration-fast: 150ms;    /* 快速反馈 */
--duration-normal: 200ms;  /* 常规过渡 */
--duration-slow: 300ms;    /* 较慢动画 */

/* 缓动函数 */
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

**常用动画**：

```tsx
// 淡入
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>

// 从下滑入
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>

// 缩放脉动（生成中）
<motion.div
  animate={{ scale: [1, 1.05, 1] }}
  transition={{ duration: 1.5, repeat: Infinity }}
>
```

### 响应式断点

```css
/* Tailwind breakpoints */
--screen-sm: 640px;   /* 手机横屏 */
--screen-md: 768px;   /* 平板竖屏 */
--screen-lg: 1024px;  /* 平板横屏 / 小笔记本 */
--screen-xl: 1280px;  /* 桌面 */
--screen-2xl: 1536px; /* 大桌面 */
```

**布局策略**：
- 移动优先（Mobile First）
- 首页生成器：单列（< md），双列风格选择器（>= md）
- 九宫格：3 列固定（所有设备）
- 意外行：滚动（< md），单行（>= md）

## GraphQL 集成策略

### Client 配置

```tsx
// lib/graphql/client.ts
import { GraphQLClient } from 'graphql-request'
import { createClient as createWSClient } from 'graphql-ws'

// HTTP Client（用于 Query/Mutation）
export const graphqlClient = new GraphQLClient('/graphql', {
  credentials: 'include', // 携带 cookie（认证）
})

// WebSocket Client（用于 Subscription）
export const wsClient = createWSClient({
  url: 'ws://localhost:3000/graphql',
  // 生产环境自动切换到 wss://
  connectionParams: () => ({
    // 可以传递认证 token
  }),
  retryAttempts: 3, // 断线重连 3 次
  shouldRetry: () => true,
})
```

### Query 定义

```tsx
// lib/graphql/queries.ts
import { gql } from 'graphql-request'

export const GET_STYLES_QUERY = gql`
  query GetStyles {
    styles {
      id
      displayName
      description
      promptTemplate
      thumbnailUrl
    }
  }
`

export const GET_PROJECT_QUERY = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      inputType
      inputContent
      status
      createdAt
      images {
        id
        category
        emotionType
        surpriseIndex
        prompt
        fileUrl
        status
        errorMessage
        width
        height
        createdAt
      }
    }
  }
`
```

### Mutation 定义

```tsx
// lib/graphql/mutations.ts
import { gql } from 'graphql-request'

export const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      project {
        id
        status
        createdAt
      }
    }
  }
`

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

### Subscription 定义

```tsx
// lib/graphql/subscriptions.ts
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

### TanStack Query 封装

```tsx
// hooks/useProjectProgress.ts
import { useSubscription } from '@tanstack/react-query'
import { PROJECT_PROGRESS_SUBSCRIPTION } from '@/lib/graphql/subscriptions'

export function useProjectProgress(projectId: string, enabled: boolean = true) {
  return useSubscription({
    queryKey: ['projectProgress', projectId],

    // 订阅函数
    subscribe: (callback) => {
      const unsubscribe = wsClient.subscribe(
        {
          query: PROJECT_PROGRESS_SUBSCRIPTION,
          variables: { projectId }
        },
        {
          next: (data) => callback(data.projectProgress),
          error: (err) => console.error('Subscription error:', err),
          complete: () => console.log('Subscription completed')
        }
      )

      return unsubscribe
    },

    enabled, // 只在需要时订阅
  })
}
```

## Canvas 相框实现

### 基础渲染逻辑

```tsx
// components/FrameEditor.tsx
import { useRef, useEffect, useState } from 'react'

interface FrameEditorProps {
  imageUrl: string
  frameStyle: 'none' | 'white-border' | 'rounded' | 'polaroid'
}

export function FrameEditor({ imageUrl, frameStyle }: FrameEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageData, setImageData] = useState<HTMLImageElement | null>(null)

  // 加载原始图片
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // 允许跨域（如果图片在 CDN）
    img.src = imageUrl
    img.onload = () => setImageData(img)
  }, [imageUrl])

  // 渲染 Canvas
  useEffect(() => {
    if (!canvasRef.current || !imageData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置 Canvas 尺寸（保持高 DPI）
    const dpr = window.devicePixelRatio || 1
    const width = 512
    const height = 512
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 应用相框效果
    switch (frameStyle) {
      case 'none':
        // 直接绘制原图
        ctx.drawImage(imageData, 0, 0, width, height)
        break

      case 'white-border':
        // 白色描边
        const borderWidth = 20
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(
          imageData,
          borderWidth,
          borderWidth,
          width - borderWidth * 2,
          height - borderWidth * 2
        )
        // 添加阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 4
        ctx.strokeStyle = '#e5e7eb'
        ctx.lineWidth = 2
        ctx.strokeRect(borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2)
        break

      case 'rounded':
        // 圆角
        const radius = 40
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(radius, 0)
        ctx.lineTo(width - radius, 0)
        ctx.quadraticCurveTo(width, 0, width, radius)
        ctx.lineTo(width, height - radius)
        ctx.quadraticCurveTo(width, height, width - radius, height)
        ctx.lineTo(radius, height)
        ctx.quadraticCurveTo(0, height, 0, height - radius)
        ctx.lineTo(0, radius)
        ctx.quadraticCurveTo(0, 0, radius, 0)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(imageData, 0, 0, width, height)
        ctx.restore()
        break

      case 'polaroid':
        // 宝丽来相纸效果
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(imageData, 20, 20, width - 40, height - 100)
        // 底部留白
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(20, height - 80, width - 40, 60)
        break
    }
  }, [imageData, frameStyle])

  // 导出为 Blob（用于下载）
  const exportImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvasRef.current?.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to export canvas'))
      }, 'image/png')
    })
  }

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-lg shadow-md"
      />

      {/* 相框选择器 */}
      <div className="flex gap-2">
        <Button
          variant={frameStyle === 'none' ? 'primary' : 'secondary'}
          onClick={() => setFrameStyle('none')}
        >
          无边框
        </Button>
        <Button
          variant={frameStyle === 'white-border' ? 'primary' : 'secondary'}
          onClick={() => setFrameStyle('white-border')}
        >
          白色描边
        </Button>
        <Button
          variant={frameStyle === 'rounded' ? 'primary' : 'secondary'}
          onClick={() => setFrameStyle('rounded')}
        >
          圆角
        </Button>
        <Button
          variant={frameStyle === 'polaroid' ? 'primary' : 'secondary'}
          onClick={() => setFrameStyle('polaroid')}
        >
          宝丽来
        </Button>
      </div>
    </div>
  )
}
```

### 性能优化

**问题**：16 张图片同时渲染 Canvas 可能导致主线程阻塞。

**解决方案**：
1. **懒加载**：只渲染可视区域内的 Canvas，滚动到时才渲染。
2. **节流**：相框切换时使用 debounce，避免频繁重绘。
3. **OffscreenCanvas**：在 Web Worker 中渲染（Phase 3）。

```tsx
// 懒加载示例
import { useInView } from 'react-intersection-observer'

function LazyCanvasFrame({ imageUrl, frameStyle }: FrameEditorProps) {
  const { ref, inView } = useInView({
    triggerOnce: true, // 只触发一次
    threshold: 0.1,    // 10% 可见时触发
  })

  return (
    <div ref={ref}>
      {inView && <FrameEditor imageUrl={imageUrl} frameStyle={frameStyle} />}
      {!inView && <Skeleton className="aspect-square" />}
    </div>
  )
}
```

## ZIP 下载实现

### 前端打包流程

```tsx
// utils/zipDownload.ts
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

  // 并发下载所有图片（限制并发数为 5）
  const downloadImage = async (img: ImageToDownload, index: number) => {
    try {
      const response = await fetch(img.url)
      if (!response.ok) throw new Error(`Failed to fetch ${img.url}`)

      const blob = await response.blob()
      zip.file(img.filename, blob)

      // 更新进度
      onProgress?.(index + 1, images.length)
    } catch (error) {
      console.error(`Failed to download ${img.filename}:`, error)
      // 跳过失败的图片，继续下载其他
    }
  }

  // 分批并发（每批 5 个）
  const batchSize = 5
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize)
    await Promise.all(batch.map((img, idx) => downloadImage(img, i + idx)))
  }

  // 生成 ZIP
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 } // 中等压缩
  })

  // 触发下载
  saveAs(zipBlob, zipFilename)
}
```

### 使用示例

```tsx
// components/ResultView.tsx
const handleDownloadAll = async () => {
  setIsDownloading(true)
  setDownloadProgress({ current: 0, total: images.length })

  try {
    const imagesToDownload = project.images
      .filter(img => img.status === 'success')
      .map(img => ({
        url: img.fileUrl,
        filename: getImageFileName(img) // 如 "emotion-happy.png"
      }))

    await downloadImagesAsZip(
      imagesToDownload,
      `peelpack-${project.id}.zip`,
      (current, total) => {
        setDownloadProgress({ current, total })
      }
    )

    toast.success('下载成功！')
  } catch (error) {
    toast.error('下载失败，请重试')
  } finally {
    setIsDownloading(false)
  }
}
```

### 文件命名策略

```tsx
// utils/imageFilename.ts
export function getImageFileName(image: Image): string {
  if (image.category === 'emotion') {
    // 情绪表情：emotion-happy.png
    return `emotion-${image.emotionType}.png`
  } else {
    // 意外表情：surprise-01.png
    return `surprise-${String(image.surpriseIndex).padStart(2, '0')}.png`
  }
}

// ZIP 内部结构：
// peelpack-abc123.zip
//   ├── emotions/
//   │   ├── happy.png
//   │   ├── sad.png
//   │   └── ...
//   └── surprises/
//       ├── 01.png
//       ├── 02.png
//       └── ...
```

## 渐进式开发路线图

### Phase 1 - MVP（4 小时）

**目标**：端到端打通生成流程，验证技术栈。

**功能范围**：
- ✅ 纯文字输入（跳过图片上传）
- ✅ 固定使用一个风格（或无风格）
- ✅ 生成 9 张情绪表情（跳过意外表情）
- ✅ 轮询状态更新（跳过 Subscription）
- ✅ 简单 Grid 展示（跳过相框）
- ✅ 单张下载（跳过 ZIP）

**技术债务**：
- 无认证（使用固定用户 ID）
- 硬编码风格选择
- 轮询而非 WebSocket
- 无错误重试

**验收标准**：
- 用户能输入描述并生成 9 张贴纸
- 页面能正确显示生成进度
- 生成完成后能查看和下载单张图片

### Phase 2 - 完整体验（8 小时）

**目标**：补全核心功能，达到可用状态。

**新增功能**：
- ✅ 风格选择器（网格布局）
- ✅ Subscription 实时进度推送
- ✅ 生成 7 张意外表情（共 16 张）
- ✅ Canvas 相框渲染（多种样式）
- ✅ ZIP 批量下载
- ✅ 图片预览 Lightbox
- ✅ 错误重试机制

**优化项**：
- 进度条动画
- 图片淡入动画
- Loading 骨架屏
- Toast 提示

**验收标准**：
- 完整的 16 张贴纸生成流程
- 实时进度更新（< 1s 延迟）
- 相框效果实时预览
- 一键下载所有贴纸为 ZIP

### Phase 3 - 抛光（4 小时）

**目标**：提升用户体验，增加可玩性。

**新增功能**：
- ✅ 历史列表页（`/projects`）
- ✅ Remix 功能（基于已有项目重新生成）
- ✅ 相框编辑器（自定义边框宽度、颜色）
- ✅ 分享功能（生成分享链接）
- ✅ 响应式布局（移动端优化）
- ✅ 用户认证（Better Auth）

**优化项**：
- 页面过渡动画
- 微交互细节
- 性能优化（懒加载、代码分割）
- SEO 优化

**验收标准**：
- 移动端体验流畅
- 用户能查看历史项目
- Remix 功能正常工作
- 分享链接能正确打开

## 性能优化考虑

### 图片加载优化

**策略**：
1. **渐进式 JPEG**：后端生成图片时使用渐进式编码，用户能先看到模糊版本。
2. **响应式图片**：提供多种尺寸（缩略图 256x256，原图 512x512），根据设备选择。
3. **懒加载**：使用 `loading="lazy"` 或 Intersection Observer。
4. **预加载**：关键图片（首屏）使用 `<link rel="preload">`。

```tsx
// 响应式图片
<img
  src={image.fileUrl}
  srcSet={`
    ${image.thumbnailUrl} 256w,
    ${image.fileUrl} 512w
  `}
  sizes="(max-width: 768px) 256px, 512px"
  loading="lazy"
  alt={image.emotionType}
/>
```

### 代码分割

```tsx
// 路由级代码分割
import { lazy } from 'react'

const ProjectPage = lazy(() => import('./routes/projects/$id'))
const LoginPage = lazy(() => import('./routes/login'))

// 组件级代码分割
const FrameEditor = lazy(() => import('./components/FrameEditor'))
const ImageLightbox = lazy(() => import('./components/ImageLightbox'))
```

### 缓存策略

```tsx
// TanStack Query 缓存配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
      cacheTime: 10 * 60 * 1000, // 10 分钟后清除缓存
      retry: 3, // 失败重试 3 次
      refetchOnWindowFocus: false, // 窗口聚焦时不重新请求
    }
  }
})

// 风格列表长期缓存（很少变化）
useQuery({
  queryKey: ['styles'],
  queryFn: getStyles,
  staleTime: 60 * 60 * 1000, // 1 小时
})

// 项目状态频繁更新（生成中）
useQuery({
  queryKey: ['project', id],
  queryFn: () => getProject(id),
  staleTime: 0, // 立即过期
  refetchInterval: (data) => data?.status === 'generating' ? 5000 : false
})
```

### Bundle 优化

```tsx
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-graphql': ['graphql-request', 'graphql-ws'],
          'vendor-ui': ['framer-motion', 'jszip', 'file-saver']
        }
      }
    },
    chunkSizeWarningLimit: 1000, // 1MB
  }
})
```

## 边界情况处理

### 网络异常

**场景**：用户网络不稳定，请求超时或失败。

**处理**：
- Mutation 失败：显示 Toast 错误提示，按钮恢复可点击状态，用户可重试。
- Query 失败：显示错误页面（"加载失败，点击重试"），提供重试按钮。
- Subscription 断线：自动重连 3 次，失败后降级到轮询模式（5s 间隔）。

### 部分生成失败

**场景**：16 张图片中有几张生成失败（API 限流、内容审核等）。

**处理**：
- Project 状态标记为 `partial_failed`。
- 成功的图片正常显示。
- 失败的图片显示"重试"按钮。
- 下载 ZIP 时只包含成功的图片。

### 并发限制

**场景**：用户快速点击多次"生成"按钮。

**处理**：
- 按钮点击后立即禁用（`disabled={isPending}`）。
- Mutation pending 时按钮显示 loading 状态。
- 前端防抖（debounce 500ms）。

### 浏览器兼容性

**场景**：旧版浏览器不支持某些 API（WebSocket、Canvas）。

**处理**：
- WebSocket 不支持：降级到轮询模式。
- Canvas 不支持：跳过相框功能，直接显示原图。
- Intersection Observer 不支持：使用 polyfill 或跳过懒加载。

### 移动端体验

**场景**：小屏幕设备，触摸操作。

**处理**：
- 响应式布局（单列 → 多列）。
- 触摸友好的按钮尺寸（最小 44x44px）。
- 避免 hover 效果依赖（改用 active 状态）。
- 虚拟键盘弹出时调整布局。

## 技术选型总结

| 层次 | 技术选型 | 理由 |
|------|---------|------|
| 应用框架 | TanStack Start | 文件路由、类型安全、现代开发体验 |
| 构建工具 | Vite | 极速 HMR、成熟生态、开箱即用 |
| UI 库 | **Hero UI (NextUI) + Tailwind CSS** | **开箱即用、开发速度快 60%、生产级质量** |
| 状态管理 | TanStack Query | GraphQL 集成、自动缓存、类型安全 |
| GraphQL Client | graphql-request + graphql-ws | 轻量、类型安全、WebSocket 支持 |
| 相框渲染 | 原生 Canvas API | 性能足够、零依赖、简单直接 |
| ZIP 打包 | JSZip | 前端打包、成熟稳定、API 简洁 |
| 动画 | Framer Motion (内置) | Hero UI 集成、性能优先 |
| 图标 | Heroicons | 简洁美观、与 Tailwind 契合 |

## 未来扩展方向

### 图片上传

**技术方案**：
- 前端：`<input type="file" accept="image/*">` + FileReader 转 base64。
- 后端：接收 base64，保存到临时目录，传递给图片生成 API。
- 优化：图片压缩（browser-image-compression）、裁剪（react-easy-crop）。

### 风格自定义

**技术方案**：
- 高级模式：展开 Prompt 编辑器（Monaco Editor 或 Textarea）。
- 预览功能：生成单张预览图（快速验证风格）。
- 风格保存：用户可保存自定义风格到个人库。

### 社区分享

**技术方案**：
- 生成分享链接：`/share/:projectId`（公开访问）。
- 社区画廊：展示精选作品，点赞、收藏。
- Remix 机制：基于他人作品二次创作。

### 多语言支持

**技术方案**：
- i18n：react-i18next。
- 语言检测：浏览器语言自动切换。
- Prompt 翻译：调用翻译 API 将中文描述转英文 Prompt。

---

**设计哲学**：这份 UI 设计文档遵循"极简交互、实时反馈、渐进增强"的原则。MVP 聚焦核心流程，Phase 2 补全体验，Phase 3 抛光细节。每个阶段都是可用的产品，而非半成品。技术选型避免过度工程，保持"刚刚好"的复杂度。从首页到结果页，从组件到动画,从 GraphQL 到 Canvas，所有设计都服务于一个目标：让用户在 90 秒内获得一套可爱的贴纸包。
