# PeelPack 系统设计文档

## 系统概述

PeelPack 是一个专注于 AI 贴纸生成的 Web 应用，核心使命是将"单张好看的 AI 图"转化为"整套可用的贴纸包"。系统接受文字描述、图片上传或两者混合作为输入，在 90 秒内生成一套包含 16 张图片的贴纸包（9 张核心情绪表情 + 7 张随机意外表情），保证角色的视觉一致性和风格统一性。产品定位为"小贴纸机"——不追求无限可能的美术工具，而是专注于把贴纸生成这一件事做到好用、好玩、好分享。

技术架构采用前后端分离的单体部署方案。前端使用 TanStack Start（基于 Vite）配合 React 和 TanStack 生态，后端使用 Bun 运行时搭配 Hono 框架。前后端通过 GraphQL 通信，利用 Subscription 实现生成进度的实时推送。数据持久化使用 SQLite 存储元数据，本地文件系统存储图片文件。图片生成通过抽象层调用第三方 AI 模型 API，优先使用 Google Nano Banana。整个系统以单一 Bun 进程运行，开发环境前后端分离（5173 + 3000），生产环境由 Hono 统一服务所有请求。

## 核心功能模块

### 生成模块 (gen)

生成模块负责从零到一创建贴纸包。用户提供输入（文字描述、图片或混合）和风格选择，系统构造 16 个不同的 Prompt 并发调用图片生成 API。九宫格情绪使用预定义的情绪模板（happy, sad, angry, surprised, thinking, shy, proud, tired, love），七个意外表情从包含 50+ 种动作场景的意外池中随机抽取。

生成流程是异步的。用户点击生成按钮后，后端立即创建 Project 和 16 个 Image 记录（状态为 pending），返回 jobId。后端使用 Promise.allSettled 并发发起 16 个图片生成请求，每完成一张更新数据库并通过 GraphQL Subscription 推送进度。如果某张生成失败，自动重试一次（使用不同的 seed 增加随机性）；重试后仍失败则标记为 failed，但不阻塞其他图片。最终用户拿到的可能是 16 张全部成功、或者 15 张成功 1 张失败的部分结果，系统保证容错而非完美。

### 编辑模块 (edit)

编辑模块负责对已有图片进行风格转换。用户上传一张或多张图片，选择目标风格，系统对每张图片应用风格转换。与生成模块的区别在于：edit 不需要构造情绪变体，只需要应用风格 Prompt；edit 的输入是确定的图片，不涉及角色定义的抽象描述。

两个模块在后端共享同一个图片生成抽象层，只是业务逻辑层的 Prompt 构造方式不同。这种设计避免了代码重复，同时保持了功能的清晰分离。

### Remix 机制

Remix 是 PeelPack 的核心交互模式。每次生成都创建新的 Project，而非覆盖旧的。用户可以基于相同输入尝试不同风格，或者多次生成获得不同的随机意外表情。每个 Project 记录完整的输入参数（inputType, inputContent, styleId, customPrompt, seed），如果是基于已有 Project 的 Remix，还记录 remixFromId 形成链条。

这种设计保留了完整的创作历史。用户可以对比不同版本，挑选最满意的，删除某个 Project 不会影响其他版本。未来可以在 UI 中展示 Remix 关系图，让用户看到自己的创作演化路径。

### 相框装饰

相框效果在前端通过 Canvas 实现，保留原始图片不做修改。用户浏览贴纸时，前端加载原始 PNG 在 Canvas 上绘制并添加边框效果（白色描边、圆角、阴影）。下载时可选择原图或带边框版本（通过 Canvas.toBlob 导出）。这种非破坏性设计让用户可以在同一套贴纸上尝试不同相框，实时预览效果，无需重新生成。

相框不只是视觉装饰，更是产品定位的具象化——PeelPack 是"小贴纸机"，相框让每张图片看起来像可以从背景中"撕下来"的独立贴纸，呼应了产品名称中的"Peel"（剥离）。

## 数据模型设计

### User 用户实体

```typescript
interface User {
  id: string                    // UUID
  email: string                 // 邮箱地址，唯一索引
  displayName: string | null    // 显示名称
  avatarUrl: string | null      // 头像 URL
  createdAt: Date               // 创建时间
  updatedAt: Date               // 更新时间
}
```

用户认证信息由 Better Auth 管理，包括密码哈希、OAuth 关联、session token 等。User 表只存储基本资料。

### Project 项目实体

```typescript
interface Project {
  id: string                    // UUID
  userId: string                // 所属用户 ID，外键

  // 输入参数
  inputType: 'text' | 'image' | 'mixed'
  inputContent: string          // 文字描述或图片路径（JSON 编码）

  // 风格参数
  styleId: string | null        // 预设风格 ID
  customPrompt: string | null   // 用户自定义 Prompt

  // 生成参数
  seed: number                  // 随机种子

  // Remix 关系
  remixFromId: string | null    // 源 Project ID

  // 状态
  status: 'pending' | 'generating' | 'completed' | 'partial_failed'

  // 时间戳
  createdAt: Date
  updatedAt: Date
}
```

inputContent 的存储格式：
- 纯文字：`{ type: 'text', content: '猫耳少女' }`
- 纯图片：`{ type: 'image', path: 'uploads/xxx.png' }`
- 混合：`{ type: 'mixed', text: '动漫风格', imagePath: 'uploads/xxx.png' }`

status 聚合自 16 张 Image 的状态：
- pending: Project 刚创建，Image 尚未开始生成
- generating: 至少一张 Image 在生成中
- completed: 所有 Image 都是 success
- partial_failed: 有 Image 是 failed，但至少有一张 success

### Image 图片实体

```typescript
interface Image {
  id: string                    // UUID
  projectId: string             // 所属 Project ID，外键

  // 类型标识
  category: 'emotion' | 'surprise'
  emotionType: string | null    // 情绪类型（happy/sad/...），仅 category=emotion 时有值
  surpriseIndex: number | null  // 意外序号（0-6），仅 category=surprise 时有值

  // 生成参数
  prompt: string                // 完整的生成 Prompt
  seed: number                  // 随机种子

  // 存储路径
  filePath: string              // 相对路径：{userId}/{projectId}/{imageId}.png

  // 状态
  status: 'pending' | 'generating' | 'success' | 'failed'
  errorMessage: string | null   // 失败时的错误信息
  retryCount: number            // 重试次数

  // 元数据
  width: number | null          // 图片宽度
  height: number | null         // 图片高度
  modelMetadata: string | null  // 模型返回的额外信息（JSON）

  // 时间戳
  createdAt: Date
  updatedAt: Date
}
```

每个 Project 有 16 个 Image：9 个 emotion（emotionType 对应九宫格）+ 7 个 surprise（surpriseIndex 0-6）。

### Style 风格预设

```typescript
interface Style {
  id: string                    // UUID
  displayName: string           // 显示名称："日系动漫"
  description: string           // 描述："柔和色调的动漫风格"
  promptTemplate: string        // Prompt 模板："anime style, soft pastel colors..."
  thumbnailUrl: string | null   // 预览缩略图
  sortOrder: number             // 排序权重
  isActive: boolean             // 是否启用
  createdAt: Date
  updatedAt: Date
}
```

风格预设存储在数据库中，通过 GraphQL Query 动态返回给前端。产品团队可以随时添加、修改、禁用风格，无需改动代码。

### Job 任务状态（虚拟实体）

Job 不是独立的表，而是 Project 的视图。GraphQL 的 Job type 实际查询 Project + 关联的 Image 数组，聚合计算进度信息：

```typescript
interface Job {
  id: string                    // 等同于 Project.id
  status: 'generating' | 'completed' | 'partial_failed'
  progress: {
    current: number             // 已完成数量（success + failed）
    total: number               // 总数量（16）
    successCount: number        // 成功数量
    failedCount: number         // 失败数量
  }
  imageArray: Image[]           // 所有关联的 Image
}
```

### 数据库 Schema (SQLite)

```sql
-- User 表由 Better Auth 管理，此处省略

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  input_type TEXT NOT NULL CHECK(input_type IN ('text', 'image', 'mixed')),
  input_content TEXT NOT NULL,
  style_id TEXT,
  custom_prompt TEXT,
  seed INTEGER NOT NULL,
  remix_from_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'generating', 'completed', 'partial_failed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (style_id) REFERENCES styles(id) ON DELETE SET NULL,
  FOREIGN KEY (remix_from_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

CREATE TABLE images (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('emotion', 'surprise')),
  emotion_type TEXT,
  surprise_index INTEGER,
  prompt TEXT NOT NULL,
  seed INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'generating', 'success', 'failed')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  model_metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_images_project_id ON images(project_id);
CREATE INDEX idx_images_status ON images(status);

CREATE TABLE styles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_styles_sort_order ON styles(sort_order ASC);
CREATE INDEX idx_styles_is_active ON styles(is_active);
```

## GraphQL API 设计

### Type 定义

```graphql
type User {
  id: ID!
  email: String!
  displayName: String
  avatarUrl: String
  projectArray: [Project!]!
  createdAt: DateTime!
}

type Project {
  id: ID!
  user: User!
  inputType: InputType!
  inputContent: String!
  style: Style
  customPrompt: String
  seed: Int!
  remixFrom: Project
  status: ProjectStatus!
  imageArray: [Image!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum InputType {
  TEXT
  IMAGE
  MIXED
}

enum ProjectStatus {
  PENDING
  GENERATING
  COMPLETED
  PARTIAL_FAILED
}

type Image {
  id: ID!
  project: Project!
  category: ImageCategory!
  emotionType: String
  surpriseIndex: Int
  prompt: String!
  filePath: String!
  fileUrl: String!          # 通过 getUrl() 计算得到的访问 URL
  status: ImageStatus!
  errorMessage: String
  retryCount: Int!
  width: Int
  height: Int
  createdAt: DateTime!
}

enum ImageCategory {
  EMOTION
  SURPRISE
}

enum ImageStatus {
  PENDING
  GENERATING
  SUCCESS
  FAILED
}

type Style {
  id: ID!
  displayName: String!
  description: String!
  promptTemplate: String!
  thumbnailUrl: String
  sortOrder: Int!
}

type Job {
  id: ID!
  status: JobStatus!
  progress: JobProgress!
  imageArray: [Image!]!
}

enum JobStatus {
  GENERATING
  COMPLETED
  PARTIAL_FAILED
}

type JobProgress {
  current: Int!
  total: Int!
  successCount: Int!
  failedCount: Int!
}
```

### Query 定义

```graphql
type Query {
  # 当前用户信息
  me: User

  # 用户的 Project 列表（分页）
  projectArray(
    offset: Int = 0
    limit: Int = 20
    orderBy: ProjectOrderBy = CREATED_AT_DESC
  ): ProjectConnection!

  # 单个 Project 详情
  project(id: ID!): Project

  # 可用风格列表
  styleArray: [Style!]!

  # Job 状态查询
  job(id: ID!): Job
}

enum ProjectOrderBy {
  CREATED_AT_DESC
  CREATED_AT_ASC
  UPDATED_AT_DESC
}

type ProjectConnection {
  nodeArray: [Project!]!
  totalCount: Int!
  hasMore: Boolean!
}
```

### Mutation 定义

```graphql
type Mutation {
  # 创建新 Project（生成贴纸包）
  createProject(input: CreateProjectInput!): CreateProjectPayload!

  # 删除 Project
  deleteProject(id: ID!): DeleteProjectPayload!

  # 重新生成失败的 Image
  retryImage(id: ID!): RetryImagePayload!

  # Remix 已有 Project
  remixProject(
    sourceId: ID!
    styleId: ID
    customPrompt: String
  ): CreateProjectPayload!
}

input CreateProjectInput {
  inputType: InputType!
  inputContent: String!      # JSON 字符串
  styleId: ID
  customPrompt: String
  seed: Int                  # 可选，不提供则随机生成
}

type CreateProjectPayload {
  project: Project!
  jobId: ID!
}

type DeleteProjectPayload {
  success: Boolean!
  deletedId: ID!
}

type RetryImagePayload {
  image: Image!
}
```

### Subscription 定义

```graphql
type Subscription {
  # 订阅 Job 进度更新
  jobProgress(jobId: ID!): JobProgressUpdate!
}

type JobProgressUpdate {
  jobId: ID!
  status: JobStatus!
  progress: JobProgress!
  latestCompletedImage: Image  # 最新完成的 Image（如果有）
  timestamp: DateTime!
}
```

## 系统架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  TanStack Start (React SPA)                           │  │
│  │  ├─ TanStack Router (文件路由)                        │  │
│  │  ├─ TanStack Query (GraphQL Client)                   │  │
│  │  └─ Canvas (相框渲染)                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          │ GraphQL (HTTP + WebSocket)       │
│                          ↓                                   │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                    Bun Runtime (3000)                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Hono Server                                           │  │
│  │  ├─ Static Files (/)                                   │  │
│  │  ├─ GraphQL Endpoint (/graphql)                        │  │
│  │  ├─ Static Data (/data/*)                              │  │
│  │  └─ Better Auth (/auth/*)                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                  │  │
│  │  ├─ gen Module (贴纸生成)                              │  │
│  │  ├─ edit Module (风格转换)                             │  │
│  │  ├─ Prompt Builder (Prompt 构造器)                     │  │
│  │  └─ Job Manager (任务管理)                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Adapter Layer                                         │  │
│  │  ├─ Image Generation Adapter (抽象接口)                │  │
│  │  │   ├─ Google Nano Banana Adapter (优先)             │  │
│  │  │   ├─ OpenAI Adapter                                 │  │
│  │  │   └─ Stability Adapter                              │  │
│  │  └─ Storage Adapter (抽象接口)                         │  │
│  │      └─ Local Filesystem Adapter                       │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Data Layer                                            │  │
│  │  ├─ SQLite (data/peelpack.db)                          │  │
│  │  └─ File System (data/{userId}/{projectId}/)           │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                           │
                           ↓
               ┌───────────────────────┐
               │  Google Nano Banana   │
               │  Image Generation API │
               └───────────────────────┘
```

### 前端架构

前端采用 TanStack Start 作为应用框架，底层使用 Vite 作为构建工具。文件路由结构：

```
app/
├── routes/
│   ├── index.tsx              # 首页
│   ├── login.tsx              # 登录页
│   ├── generate/
│   │   └── index.tsx          # 生成页面
│   ├── projects/
│   │   ├── index.tsx          # Project 列表
│   │   └── $id.tsx            # Project 详情（含进度监听）
│   └── settings/
│       └── index.tsx          # 用户设置
├── components/
│   ├── StyleSelector.tsx      # 风格选择器
│   ├── InputSelector.tsx      # 输入模式选择器
│   ├── ProgressMonitor.tsx    # 进度监控（Subscription）
│   ├── StickerGrid.tsx        # 贴纸九宫格展示
│   └── FrameEditor.tsx        # 相框编辑器（Canvas）
├── lib/
│   ├── graphql/
│   │   ├── client.ts          # GraphQL Client 配置
│   │   ├── queries.ts         # Query 定义
│   │   ├── mutations.ts       # Mutation 定义
│   │   └── subscriptions.ts   # Subscription 定义
│   └── utils/
│       ├── canvas.ts          # Canvas 工具函数
│       └── zip.ts             # ZIP 打包工具
└── config.ts                  # 前端配置
```

TanStack Query 负责 GraphQL 通信和状态管理，配置 GraphQL Client 支持 HTTP（Query/Mutation）和 WebSocket（Subscription）双协议。

### 后端架构

后端采用分层架构，从上到下依次是：HTTP 层（Hono）、业务逻辑层、适配器层、数据层。

```
src/
├── server.ts                  # Hono 服务器入口
├── graphql/
│   ├── schema.ts              # GraphQL Schema 定义
│   ├── resolvers/
│   │   ├── query.ts           # Query Resolver
│   │   ├── mutation.ts        # Mutation Resolver
│   │   └── subscription.ts    # Subscription Resolver
│   └── context.ts             # GraphQL Context（含用户认证）
├── modules/
│   ├── gen/
│   │   ├── service.ts         # 生成业务逻辑
│   │   └── promptBuilder.ts   # Prompt 构造器
│   ├── edit/
│   │   └── service.ts         # 编辑业务逻辑
│   └── job/
│       ├── manager.ts         # Job 管理器
│       └── executor.ts        # 异步任务执行器
├── adapters/
│   ├── imageGeneration/
│   │   ├── interface.ts       # 抽象接口定义
│   │   ├── nanoBanana.ts      # Google Nano Banana 适配器
│   │   ├── openai.ts          # OpenAI 适配器
│   │   └── stability.ts       # Stability 适配器
│   └── storage/
│       ├── interface.ts       # 抽象接口定义
│       └── filesystem.ts      # 本地文件系统适配器
├── db/
│   ├── client.ts              # SQLite 客户端
│   ├── schema.sql             # 数据库 Schema
│   └── queries.ts             # SQL 查询函数
├── auth/
│   └── betterAuth.ts          # Better Auth 配置
└── config/
    ├── emotions.json          # 九宫格情绪模板
    └── surprises.json         # 意外池
```

### 图片生成抽象层

抽象接口定义：

```typescript
// adapters/imageGeneration/interface.ts
export interface ImageGenerationAdapter {
  generate(params: GenerateParams): Promise<GenerateResult>
}

export interface GenerateParams {
  prompt: string                    // 完整 Prompt
  referenceImage?: string           // 参考图片（base64 或 URL）
  width?: number                    // 宽度
  height?: number                   // 高度
  seed?: number                     // 随机种子
  styleHint?: string                // 风格提示
}

export interface GenerateResult {
  imageUrl?: string                 // 图片 URL
  imageBase64?: string              // 图片 base64
  width: number                     // 实际宽度
  height: number                    // 实际高度
  metadata?: Record<string, any>    // 模型返回的额外信息
}
```

Google Nano Banana 适配器实现（示例）：

```typescript
// adapters/imageGeneration/nanoBanana.ts
export class NanoBananaAdapter implements ImageGenerationAdapter {
  private apiKey: string
  private baseUrl: string

  constructor(config: { apiKey: string; baseUrl: string }) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    // 转换参数格式为 Nano Banana API 格式
    const requestBody = {
      prompt: params.prompt,
      image: params.referenceImage,
      width: params.width || 512,
      height: params.height || 512,
      seed: params.seed,
      // ... 其他 Nano Banana 特定参数
    }

    // 调用 API
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    // 转换返回格式为统一的 GenerateResult
    return {
      imageUrl: data.output.url,
      width: data.output.width,
      height: data.output.height,
      metadata: {
        modelVersion: data.version,
        executionTime: data.metrics.predict_time,
      },
    }
  }
}
```

适配器工厂（根据配置选择）：

```typescript
// adapters/imageGeneration/factory.ts
export function createImageGenerationAdapter(
  provider: 'nanoBanana' | 'openai' | 'stability'
): ImageGenerationAdapter {
  switch (provider) {
    case 'nanoBanana':
      return new NanoBananaAdapter({
        apiKey: process.env.NANO_BANANA_API_KEY!,
        baseUrl: process.env.NANO_BANANA_BASE_URL!,
      })
    case 'openai':
      return new OpenAIAdapter({ /* ... */ })
    case 'stability':
      return new StabilityAdapter({ /* ... */ })
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
```

### Prompt 构造器

Prompt 构造器负责将用户输入、风格选择、情绪类型组合成完整的 Prompt。

```typescript
// modules/gen/promptBuilder.ts
export class PromptBuilder {
  private emotionTemplateMap: Map<string, string>
  private surpriseArray: string[]

  constructor() {
    // 从配置文件加载
    const emotions = JSON.parse(readFileSync('config/emotions.json', 'utf-8'))
    const surprises = JSON.parse(readFileSync('config/surprises.json', 'utf-8'))

    this.emotionTemplateMap = new Map(Object.entries(emotions))
    this.surpriseArray = surprises
  }

  buildEmotionPrompt(params: {
    basePrompt: string          // 用户输入或风格模板
    emotionType: string         // happy/sad/...
  }): string {
    const emotionTemplate = this.emotionTemplateMap.get(params.emotionType)
    if (!emotionTemplate) {
      throw new Error(`Unknown emotion type: ${params.emotionType}`)
    }

    // 组合：基础 Prompt + 情绪模板
    return `${params.basePrompt}, ${emotionTemplate}`
  }

  buildSurprisePrompt(params: {
    basePrompt: string
    seed: number                // 用于随机抽取
  }): string {
    // 基于 seed 随机抽取一个意外
    const rng = new SeededRandom(params.seed)
    const surprise = this.surpriseArray[rng.nextInt(this.surpriseArray.length)]

    return `${params.basePrompt}, ${surprise}`
  }
}
```

### 异步任务执行器

Job Manager 负责管理生成任务的生命周期。

```typescript
// modules/job/executor.ts
export class JobExecutor {
  private imageAdapter: ImageGenerationAdapter
  private storageAdapter: StorageAdapter
  private db: SQLiteClient
  private pubsub: PubSub  // GraphQL Subscription 的发布订阅

  async executeJob(projectId: string): Promise<void> {
    // 1. 查询 Project 和所有 Image
    const project = await this.db.getProject(projectId)
    const imageArray = await this.db.getImageArrayByProject(projectId)

    // 2. 并发生成所有图片
    const resultArray = await Promise.allSettled(
      imageArray.map(image => this.generateImage(project, image))
    )

    // 3. 更新 Project 状态
    const finalStatus = this.calculateProjectStatus(imageArray)
    await this.db.updateProject(projectId, { status: finalStatus })

    // 4. 发布最终完成事件
    this.pubsub.publish(`jobProgress:${projectId}`, {
      jobId: projectId,
      status: finalStatus,
      progress: this.calculateProgress(imageArray),
      timestamp: new Date(),
    })
  }

  private async generateImage(project: Project, image: Image): Promise<void> {
    try {
      // 更新状态为 generating
      await this.db.updateImage(image.id, { status: 'generating' })
      this.publishProgress(project.id)

      // 调用图片生成 API
      const result = await this.imageAdapter.generate({
        prompt: image.prompt,
        seed: image.seed,
        // ... 其他参数
      })

      // 下载图片并保存到文件系统
      const imageBuffer = await this.downloadImage(result.imageUrl)
      await this.storageAdapter.put(image.filePath, imageBuffer)

      // 更新状态为 success
      await this.db.updateImage(image.id, {
        status: 'success',
        width: result.width,
        height: result.height,
        modelMetadata: JSON.stringify(result.metadata),
      })

      this.publishProgress(project.id, image)

    } catch (error) {
      // 失败后自动重试一次
      if (image.retryCount === 0) {
        await this.db.updateImage(image.id, { retryCount: 1 })
        // 使用不同的 seed 重试
        const newImage = { ...image, seed: image.seed + 1 }
        await this.generateImage(project, newImage)
      } else {
        // 重试后仍失败，标记为 failed
        await this.db.updateImage(image.id, {
          status: 'failed',
          errorMessage: error.message,
        })
        this.publishProgress(project.id)
      }
    }
  }

  private publishProgress(projectId: string, latestImage?: Image): void {
    const imageArray = await this.db.getImageArrayByProject(projectId)
    const progress = this.calculateProgress(imageArray)

    this.pubsub.publish(`jobProgress:${projectId}`, {
      jobId: projectId,
      status: this.calculateJobStatus(imageArray),
      progress,
      latestCompletedImage: latestImage,
      timestamp: new Date(),
    })
  }

  private calculateProgress(imageArray: Image[]): JobProgress {
    const successCount = imageArray.filter(img => img.status === 'success').length
    const failedCount = imageArray.filter(img => img.status === 'failed').length

    return {
      current: successCount + failedCount,
      total: imageArray.length,
      successCount,
      failedCount,
    }
  }
}
```

## 部署方案

### 开发环境

前端和后端分别运行在不同端口，通过 CORS 通信。

```bash
# 启动后端
cd server
bun run dev  # 运行在 3000 端口

# 启动前端
cd app
bun run dev  # 运行在 5173 端口
```

Hono 配置 CORS 允许来自 localhost:5173 的请求：

```typescript
import { cors } from 'hono/cors'

app.use('/*', cors({
  origin: 'http://localhost:5173',
  credentials: true,  // 允许携带 cookie
}))
```

### 生产环境

前端构建为静态文件，由 Hono 统一服务。

```bash
# 构建前端
cd app
bun run build  # 输出到 dist/

# 启动后端（同时服务前端）
cd server
bun run start  # 运行在 3000 端口
```

Hono 配置：

```typescript
import { serveStatic } from 'hono/bun'

// 服务前端静态文件
app.use('/*', serveStatic({ root: '../app/dist' }))

// 服务用户上传的图片
app.use('/data/*', serveStatic({ root: './data' }))

// GraphQL endpoint
app.all('/graphql', graphqlServer)
```

目录结构：

```
peelpack/
├── app/                  # 前端代码
│   ├── dist/             # 构建产物（生产环境）
│   └── ...
├── server/               # 后端代码
│   ├── src/
│   └── ...
└── data/                 # 数据目录（需持久化）
    ├── peelpack.db       # SQLite 数据库
    └── {userId}/         # 用户图片目录
        └── {projectId}/
            └── {imageId}.png
```

### Docker 部署

```dockerfile
FROM oven/bun:1 AS base

# 构建前端
FROM base AS frontend-builder
WORKDIR /app/frontend
COPY app/package.json app/bun.lockb ./
RUN bun install
COPY app/ ./
RUN bun run build

# 构建后端
FROM base AS backend-builder
WORKDIR /app/backend
COPY server/package.json server/bun.lockb ./
RUN bun install --production
COPY server/ ./

# 最终镜像
FROM base
WORKDIR /app

# 复制构建产物
COPY --from=frontend-builder /app/frontend/dist ./app/dist
COPY --from=backend-builder /app/backend ./server

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["bun", "run", "server/src/server.ts"]
```

docker-compose.yml:

```yaml
version: '3.8'

services:
  peelpack:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data  # 持久化数据目录
    environment:
      - NODE_ENV=production
      - NANO_BANANA_API_KEY=${NANO_BANANA_API_KEY}
      - NANO_BANANA_BASE_URL=${NANO_BANANA_BASE_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
    restart: unless-stopped
```

## 配置文件设计

### 情绪模板 (config/emotions.json)

```json
{
  "happy": "happy expression with bright eyes and warm smile, joyful mood",
  "sad": "sad expression with downcast eyes, melancholic atmosphere",
  "angry": "angry expression with furrowed brows, intense emotion",
  "surprised": "surprised expression with wide eyes and open mouth",
  "thinking": "thoughtful expression with hand on chin, contemplative pose",
  "shy": "shy expression with blushing cheeks, bashful demeanor",
  "proud": "proud expression with confident posture, triumphant mood",
  "tired": "tired expression with half-closed eyes, exhausted appearance",
  "love": "loving expression with heart-shaped eyes, affectionate mood"
}
```

### 意外池 (config/surprises.json)

```json
[
  "waving hand with friendly gesture",
  "giving thumbs up with encouraging smile",
  "eating delicious snack with happy expression",
  "reading book with focused attention",
  "listening to music with headphones",
  "sleeping peacefully with zzz symbols",
  "working on laptop with concentrated look",
  "exercising with energetic pose",
  "drinking coffee with relaxed mood",
  "wearing sunglasses with cool attitude",
  "holding umbrella in rain",
  "celebrating with confetti",
  "making peace sign with cheerful expression",
  "crying with tears streaming down",
  "laughing out loud with joy",
  "yawning with sleepy expression",
  "sneezing with tissue",
  "stretching arms with satisfied look",
  "taking selfie with phone",
  "blowing kiss with loving gesture",
  ...
]
```

## 技术选型总结

| 层次 | 技术选型 | 理由 |
|------|---------|------|
| 前端框架 | TanStack Start + React | 文件路由、端到端类型安全、现代开发体验 |
| 构建工具 | Vite | 快速启动、HMR、成熟生态 |
| 状态管理 | TanStack Query | GraphQL 集成、缓存管理、类型安全 |
| 后端运行时 | Bun | 极速启动、原生 TypeScript、现代 API |
| Web 框架 | Hono | 轻量级、类型安全、Bun 原生支持 |
| API 协议 | GraphQL | 类型系统、实时通信（Subscription）、前后端契约 |
| 用户认证 | Better Auth | 现代、类型安全、开箱即用 |
| 数据库 | SQLite | 零配置、嵌入式、足够简单 |
| 对象存储 | 本地文件系统 | 避免云服务复杂度、YAGNI 原则 |
| 图片生成 | Google Nano Banana | Google 最新模型、高质量输出 |
| 前端 Canvas | 原生 Canvas API | 性能足够、零依赖、简单直接 |
| ZIP 打包 | JSZip | 前端打包、减轻后端负担 |

所有技术选择都遵循同一个原则：在保持现代性的前提下，选择最简单的方案。复杂度是"刚刚好"——足够支撑产品需求，但不多一分。这不是偷懒，而是对 YAGNI 原则的忠实实践。从需求到架构，从愿景到代码，整条路径保持了惊人的一致性：产品是"小贴纸机"，架构也是"小而美"的单体；产品强调速度和可用性，技术强调简单和可靠。
