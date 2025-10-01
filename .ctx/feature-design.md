# PeelPack 功能设计文档

## MVP 目标定位

**第一个垂直切片**：纯文字输入 → 生成 9 张情绪表情

从端到端打通完整流程，验证技术栈可行性。周末项目，体验现代技术栈。

## 技术栈选择

### 确定采用
- **Hono** - Web 框架，轻量高性能
- **GraphQL + Subscription** - Bun 原生支持，体验现代技术
- **SQLite** - Bun 原生，手写 SQL
- **Bun 原生 API** - fetch/fs/WebSocket，零额外依赖

### 延后实现
- Better Auth（先用 API Key 或跳过认证）
- Drizzle ORM（手写 SQL 更简单）
- Zod 验证（TypeScript 类型足够）

### 不做的功能
- 多 AI 提供商适配器（只用 Google Nano Banana）
- 复杂 JOIN 查询（保持简单）
- Remix 链条（第一版不需要）
- 图片输入/混合输入（垂直切片后再加）

## 数据模型

### 四张表结构

```sql
-- users 表（MVP 可选，先不做认证）
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- styles 表（预设风格）
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

-- projects 表（生成任务）
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,  -- MVP 可为 NULL

  -- 输入参数
  input_type TEXT NOT NULL CHECK(input_type IN ('text', 'image', 'mixed')),
  input_content TEXT NOT NULL,  -- 文字描述

  -- 风格参数
  style_id TEXT,
  custom_prompt TEXT,

  -- 生成参数
  seed INTEGER NOT NULL,

  -- 状态
  status TEXT NOT NULL CHECK(status IN ('pending', 'generating', 'completed', 'partial_failed')),

  -- 时间戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (style_id) REFERENCES styles(id) ON DELETE SET NULL
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- images 表（生成的图片）
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,

  -- 类型标识
  category TEXT NOT NULL CHECK(category IN ('emotion', 'surprise')),
  emotion_type TEXT,  -- happy/sad/angry/surprised/thinking/shy/proud/tired/love
  surprise_index INTEGER,  -- 0-6，MVP 暂不使用

  -- 生成参数
  prompt TEXT NOT NULL,
  seed INTEGER NOT NULL,

  -- 存储路径
  file_path TEXT NOT NULL,  -- 相对路径：data/images/{projectId}/{imageId}.png

  -- 状态
  status TEXT NOT NULL CHECK(status IN ('pending', 'generating', 'success', 'failed')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- 元数据
  width INTEGER,
  height INTEGER,
  model_metadata TEXT,  -- JSON 字符串

  -- 时间戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_images_project_id ON images(project_id);
CREATE INDEX idx_images_status ON images(status);
```

### 为什么四张表必要

1. **styles 表** - 风格预设需要动态管理，不硬编码
2. **projects 表** - 任务元数据，不混入图片细节
3. **images 表** - 每张图片独立状态，避免 JSON blob 不可读
4. **users 表** - 为未来多用户预留，MVP 可暂不启用

## GraphQL Schema

### Type 定义

```graphql
type Query {
  # 查询 Project 详情
  project(id: ID!): Project

  # 可用风格列表
  styles: [Style!]!
}

type Mutation {
  # 创建生成任务（MVP 核心）
  createProject(input: CreateProjectInput!): CreateProjectPayload!
}

type Subscription {
  # 订阅生成进度（实时推送）
  projectProgress(projectId: ID!): ProjectProgressUpdate!
}

input CreateProjectInput {
  inputType: InputType!
  inputContent: String!  # 文字描述
  styleId: ID
  customPrompt: String
  seed: Int  # 可选，不提供则随机
}

enum InputType {
  TEXT
  IMAGE  # MVP 不实现
  MIXED  # MVP 不实现
}

type CreateProjectPayload {
  project: Project!
}

type Project {
  id: ID!
  inputType: InputType!
  inputContent: String!
  status: ProjectStatus!
  images: [Image!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum ProjectStatus {
  PENDING
  GENERATING
  COMPLETED
  PARTIAL_FAILED
}

type Image {
  id: ID!
  category: ImageCategory!
  emotionType: String
  prompt: String!
  fileUrl: String!  # /data/images/{projectId}/{imageId}.png
  status: ImageStatus!
  errorMessage: String
  width: Int
  height: Int
  createdAt: DateTime!
}

enum ImageCategory {
  EMOTION
  SURPRISE  # MVP 不实现
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
}

type ProjectProgressUpdate {
  projectId: ID!
  status: ProjectStatus!
  completedCount: Int!
  totalCount: Int!
  latestImage: Image  # 最新完成的图片
  timestamp: DateTime!
}
```

## 架构设计

### 目录结构（L3 + CFP）

```text
orange/
├── index.ts              # Hono + GraphQL 服务器入口
├── package.json
├── bun.lockb
│
├── port/                 # HTTP/GraphQL 接口层
│   └── graphql/
│       ├── schema.ts     # GraphQL Schema 定义
│       ├── resolvers.ts  # Query/Mutation/Subscription Resolver
│       └── context.ts    # GraphQL Context
│
├── core/                 # 核心业务逻辑
│   ├── gen/
│   │   ├── type.ts       # GenService interface
│   │   └── proc.ts       # 生成 orchestration
│   ├── prompt/
│   │   ├── type.ts       # PromptBuilder interface
│   │   ├── proc.ts       # Prompt 构造逻辑
│   │   └── lib/
│   │       └── emotions.json   # 9 种情绪模板
│   └── image/
│       ├── type.ts       # ImageGen interface
│       └── proc.ts       # Google Nano Banana 直接调用
│
├── base/                 # 基础设施
│   ├── config/
│   │   ├── type.ts       # Config interface
│   │   └── proc.ts       # 配置加载
│   ├── db/
│   │   ├── type.ts       # Database interface
│   │   ├── proc.ts       # SQLite 操作（手写 SQL）
│   │   └── schema.sql    # 表结构
│   ├── storage/
│   │   ├── type.ts       # Storage interface
│   │   └── proc.ts       # 文件系统操作
│   ├── logger/
│   │   ├── type.ts
│   │   └── proc.ts       # 5-level logger（参考 claude-hack）
│   └── pubsub/
│       ├── type.ts       # PubSub interface
│       └── proc.ts       # 内存版 PubSub（Subscription）
│
├── data/                 # 运行时数据（.gitignore）
│   ├── peelpack.db       # SQLite
│   ├── images/           # 图片文件
│   │   └── {projectId}/
│   │       └── {imageId}.png
│   └── log/
│       └── app.log
│
└── .ctx/
    ├── system-design.md
    ├── techstack-discuss.md
    └── feature-design.md
```

### 数据流

```text
GraphQL Mutation: createProject
    ↓
Resolver: 创建 Project + 9 个 Image（pending）
    ↓
GenService.generate(projectId) - 异步执行
    ↓
PromptBuilder.buildEmotions() - 构造 9 个 Prompt
    ↓
Promise.allSettled([...9 个并发请求])
    ↓
ImageGen.generate() - 调用 Google Nano Banana
    ↓
Storage.save() - 保存图片到文件系统
    ↓
Database.updateImage() - 更新状态为 success/failed
    ↓
PubSub.publish() - 推送进度更新
    ↓
GraphQL Subscription: projectProgress - 客户端接收更新
```

## 核心模块设计

### 1. Prompt 构造器

```typescript
// core/prompt/type.ts
export interface PromptBuilder {
  buildEmotion(params: {
    basePrompt: string       // 用户输入或风格模板
    emotionType: EmotionType // 情绪类型
  }): string

  buildAllEmotions(basePrompt: string): EmotionPrompt[]
}

export type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thinking'
  | 'shy'
  | 'proud'
  | 'tired'
  | 'love'

export interface EmotionPrompt {
  emotionType: EmotionType
  prompt: string
}

// core/prompt/proc.ts
export function createPromptBuilder(): PromptBuilder {
  const emotions = loadEmotions() // 从 JSON 加载

  return {
    buildEmotion({ basePrompt, emotionType }) {
      const template = emotions[emotionType]
      return `${basePrompt}, ${template}`
    },

    buildAllEmotions(basePrompt) {
      return Object.keys(emotions).map(emotionType => ({
        emotionType: emotionType as EmotionType,
        prompt: this.buildEmotion({ basePrompt, emotionType })
      }))
    }
  }
}

// core/prompt/lib/emotions.json
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

### 2. 图片生成（直接调用 API）

```typescript
// core/image/type.ts
export interface ImageGen {
  generate(params: ImageGenParams): Promise<ImageGenResult>
}

export interface ImageGenParams {
  prompt: string
  seed?: number
  width?: number
  height?: number
}

export interface ImageGenResult {
  imageBuffer: Buffer
  width: number
  height: number
  metadata?: Record<string, any>
}

// core/image/proc.ts
export function createImageGen(config: {
  apiKey: string
  baseUrl: string
  logger: Logger
}): ImageGen {

  return {
    async generate(params) {
      config.logger.debug('Generating image', { prompt: params.prompt })

      try {
        // 调用 Google Nano Banana API
        const response = await fetch(`${config.baseUrl}/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: params.prompt,
            seed: params.seed || Math.floor(Math.random() * 1000000),
            width: params.width || 512,
            height: params.height || 512
          })
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // 下载图片
        const imageResponse = await fetch(data.imageUrl)
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

        config.logger.info('Image generated', {
          size: imageBuffer.length,
          dimensions: `${data.width}x${data.height}`
        })

        return {
          imageBuffer,
          width: data.width,
          height: data.height,
          metadata: {
            modelVersion: data.version,
            executionTime: data.metrics?.predict_time
          }
        }

      } catch (error) {
        config.logger.error('Image generation failed', { error })
        throw error
      }
    }
  }
}
```

### 3. 生成服务（核心 orchestration）

```typescript
// core/gen/type.ts
export interface GenService {
  generate(params: GenerateParams): Promise<string>  // 返回 projectId
}

export interface GenerateParams {
  inputType: 'text' | 'image' | 'mixed'
  inputContent: string
  styleId?: string
  customPrompt?: string
  seed?: number
}

// core/gen/proc.ts
export function createGenService(deps: {
  db: Database
  storage: Storage
  imageGen: ImageGen
  promptBuilder: PromptBuilder
  pubsub: PubSub
  logger: Logger
}): GenService {

  return {
    async generate(params) {
      const projectId = crypto.randomUUID()
      const seed = params.seed || Math.floor(Math.random() * 1000000)

      deps.logger.info('Creating project', { projectId, inputType: params.inputType })

      // 1. 创建 Project 记录
      await deps.db.createProject({
        id: projectId,
        inputType: params.inputType,
        inputContent: params.inputContent,
        styleId: params.styleId || null,
        customPrompt: params.customPrompt || null,
        seed,
        status: 'pending'
      })

      // 2. 构造基础 Prompt
      let basePrompt = params.inputContent
      if (params.styleId) {
        const style = await deps.db.getStyle(params.styleId)
        if (style) {
          basePrompt = `${style.promptTemplate}, ${params.inputContent}`
        }
      }
      if (params.customPrompt) {
        basePrompt = `${basePrompt}, ${params.customPrompt}`
      }

      // 3. 构造 9 个情绪 Prompt
      const emotionPrompts = deps.promptBuilder.buildAllEmotions(basePrompt)

      // 4. 创建 9 个 Image 记录（pending）
      const imageRecords = await Promise.all(
        emotionPrompts.map(async (ep, idx) => {
          const imageId = crypto.randomUUID()
          const imageSeed = seed + idx

          await deps.db.createImage({
            id: imageId,
            projectId,
            category: 'emotion',
            emotionType: ep.emotionType,
            surpriseIndex: null,
            prompt: ep.prompt,
            seed: imageSeed,
            filePath: `data/images/${projectId}/${imageId}.png`,
            status: 'pending'
          })

          return { imageId, prompt: ep.prompt, seed: imageSeed }
        })
      )

      // 5. 异步生成（不等待）
      generateAsync(projectId, imageRecords, deps)

      // 6. 立即返回 projectId
      return projectId
    }
  }
}

async function generateAsync(
  projectId: string,
  imageRecords: Array<{ imageId: string; prompt: string; seed: number }>,
  deps: Dependencies
) {
  const logger = deps.logger.child('generate-async')

  logger.info('Starting async generation', {
    projectId,
    imageCount: imageRecords.length
  })

  // 更新 Project 状态为 generating
  await deps.db.updateProject(projectId, { status: 'generating' })

  // 并发生成所有图片
  const results = await Promise.allSettled(
    imageRecords.map(async (record) => {
      try {
        // 更新状态为 generating
        await deps.db.updateImage(record.imageId, { status: 'generating' })

        // 发布进度更新
        await publishProgress(projectId, deps)

        // 调用图片生成
        const result = await deps.imageGen.generate({
          prompt: record.prompt,
          seed: record.seed
        })

        // 保存图片到文件系统
        await deps.storage.save(
          `images/${projectId}/${record.imageId}.png`,
          result.imageBuffer
        )

        // 更新状态为 success
        await deps.db.updateImage(record.imageId, {
          status: 'success',
          width: result.width,
          height: result.height,
          modelMetadata: JSON.stringify(result.metadata)
        })

        logger.info('Image generated successfully', {
          imageId: record.imageId
        })

        // 发布进度更新（带最新图片）
        await publishProgress(projectId, deps, record.imageId)

        return { success: true, imageId: record.imageId }

      } catch (error) {
        logger.error('Image generation failed', {
          imageId: record.imageId,
          error
        })

        // 失败后重试一次（使用不同 seed）
        if (record.retryCount === 0) {
          logger.info('Retrying with new seed', { imageId: record.imageId })

          await deps.db.updateImage(record.imageId, { retryCount: 1 })

          try {
            const retryResult = await deps.imageGen.generate({
              prompt: record.prompt,
              seed: record.seed + 1000  // 不同 seed
            })

            await deps.storage.save(
              `images/${projectId}/${record.imageId}.png`,
              retryResult.imageBuffer
            )

            await deps.db.updateImage(record.imageId, {
              status: 'success',
              width: retryResult.width,
              height: retryResult.height,
              modelMetadata: JSON.stringify(retryResult.metadata)
            })

            await publishProgress(projectId, deps, record.imageId)

            return { success: true, imageId: record.imageId }

          } catch (retryError) {
            // 重试后仍失败
            await deps.db.updateImage(record.imageId, {
              status: 'failed',
              errorMessage: retryError.message
            })

            await publishProgress(projectId, deps)

            return { success: false, imageId: record.imageId }
          }
        } else {
          // 已重试过，标记失败
          await deps.db.updateImage(record.imageId, {
            status: 'failed',
            errorMessage: error.message
          })

          await publishProgress(projectId, deps)

          return { success: false, imageId: record.imageId }
        }
      }
    })
  )

  // 计算最终状态
  const images = await deps.db.getImagesByProject(projectId)
  const successCount = images.filter(img => img.status === 'success').length
  const failedCount = images.filter(img => img.status === 'failed').length

  let finalStatus: ProjectStatus
  if (successCount === images.length) {
    finalStatus = 'completed'
  } else if (successCount > 0) {
    finalStatus = 'partial_failed'
  } else {
    finalStatus = 'failed'
  }

  await deps.db.updateProject(projectId, { status: finalStatus })
  await publishProgress(projectId, deps)

  logger.info('Generation completed', {
    projectId,
    status: finalStatus,
    successCount,
    failedCount
  })
}

async function publishProgress(
  projectId: string,
  deps: Dependencies,
  latestImageId?: string
) {
  const images = await deps.db.getImagesByProject(projectId)
  const project = await deps.db.getProject(projectId)

  const completedCount = images.filter(
    img => img.status === 'success' || img.status === 'failed'
  ).length

  let latestImage = null
  if (latestImageId) {
    latestImage = images.find(img => img.id === latestImageId)
  }

  await deps.pubsub.publish(`project:${projectId}`, {
    projectId,
    status: project.status,
    completedCount,
    totalCount: images.length,
    latestImage,
    timestamp: new Date()
  })
}
```

### 4. GraphQL Resolvers

```typescript
// port/graphql/resolvers.ts
export function createResolvers(deps: {
  genService: GenService
  db: Database
  pubsub: PubSub
}) {
  return {
    Query: {
      project: async (_, { id }) => {
        return await deps.db.getProject(id)
      },

      styles: async () => {
        return await deps.db.getActiveStyles()
      }
    },

    Mutation: {
      createProject: async (_, { input }) => {
        const projectId = await deps.genService.generate({
          inputType: input.inputType,
          inputContent: input.inputContent,
          styleId: input.styleId,
          customPrompt: input.customPrompt,
          seed: input.seed
        })

        const project = await deps.db.getProject(projectId)

        return { project }
      }
    },

    Subscription: {
      projectProgress: {
        subscribe: async (_, { projectId }) => {
          return deps.pubsub.subscribe(`project:${projectId}`)
        },
        resolve: (payload) => payload
      }
    },

    // Field resolvers
    Project: {
      images: async (project) => {
        return await deps.db.getImagesByProject(project.id)
      }
    },

    Image: {
      fileUrl: (image) => {
        // 返回静态文件路径
        return `/${image.filePath}`
      }
    }
  }
}
```

### 5. 内存版 PubSub

```typescript
// base/pubsub/type.ts
export interface PubSub {
  publish(channel: string, message: any): Promise<void>
  subscribe(channel: string): AsyncIterator<any>
}

// base/pubsub/proc.ts
export function createPubSub(): PubSub {
  const channels = new Map<string, Set<(message: any) => void>>()

  return {
    async publish(channel, message) {
      const subscribers = channels.get(channel)
      if (subscribers) {
        for (const callback of subscribers) {
          callback(message)
        }
      }
    },

    async *subscribe(channel) {
      const queue: any[] = []
      let resolve: ((value: IteratorResult<any>) => void) | null = null

      const callback = (message: any) => {
        if (resolve) {
          resolve({ value: message, done: false })
          resolve = null
        } else {
          queue.push(message)
        }
      }

      // 注册订阅者
      if (!channels.has(channel)) {
        channels.set(channel, new Set())
      }
      channels.get(channel)!.add(callback)

      try {
        while (true) {
          if (queue.length > 0) {
            yield queue.shift()
          } else {
            yield await new Promise<any>((res) => {
              resolve = res
            })
          }
        }
      } finally {
        // 清理订阅
        channels.get(channel)?.delete(callback)
      }
    }
  }
}
```

## 开发路线图

### Phase 1: 基础设施（1 天）

```bash
✓ 1. 初始化项目：bun init
✓ 2. 安装依赖：hono, graphql-yoga
✓ 3. 搭建目录结构（L3 架构）
✓ 4. base/config: 配置加载
✓ 5. base/logger: 5-level logger
✓ 6. base/db: SQLite + schema.sql
✓ 7. base/storage: 文件系统操作
✓ 8. base/pubsub: 内存版 PubSub
```

### Phase 2: 核心逻辑（2 天）

```bash
✓ 9. core/prompt: emotions.json + PromptBuilder
✓ 10. core/image: Google Nano Banana 调用（先 mock）
✓ 11. core/gen: GenService orchestration
✓ 12. 测试：createProject → 9 个 Image pending
```

### Phase 3: GraphQL 层（1 天）

```bash
✓ 13. port/graphql/schema: 定义 GraphQL Schema
✓ 14. port/graphql/resolvers: Query/Mutation/Subscription
✓ 15. index.ts: Hono + GraphQL Yoga 集成
✓ 16. 测试：GraphQL Playground 手动测试
```

### Phase 4: 真实集成（1 天）

```bash
✓ 17. core/image: 替换为真实 Google Nano Banana API
✓ 18. 端到端测试：文字输入 → 9 张图片生成
✓ 19. Subscription 测试：实时进度推送
✓ 20. 错误处理和重试逻辑验证
```

### Phase 5: 完善和优化（1 天）

```bash
✓ 21. 预设风格：插入 styles 表数据
✓ 22. 静态文件服务：/data/images/*
✓ 23. 日志优化：关键路径日志补全
✓ 24. 性能测试：并发生成压力测试
✓ 25. 文档：API 使用说明和示例
```

## 依赖清单

```json
{
  "name": "orange",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "hono": "^4.6.14",
    "graphql": "^16.9.0",
    "graphql-yoga": "^5.7.1"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

**说明**：
- `hono` - Web 框架
- `graphql` - GraphQL 核心库
- `graphql-yoga` - GraphQL 服务器（支持 Subscription）
- Bun 原生提供：SQLite, fetch, fs, WebSocket

## 配置文件

```bash
# .env
PORT=3000
NANO_BANANA_API_KEY=your_api_key_here
NANO_BANANA_BASE_URL=https://api.nanoBanana.com

# 数据库路径
DB_PATH=./data/peelpack.db

# 存储路径
STORAGE_PATH=./data

# 日志级别
LOG_LEVEL=info
```

## 测试策略

### 单元测试（可选）
- `core/prompt/proc.test.ts` - Prompt 构造逻辑
- `core/image/proc.test.ts` - Mock API 调用
- `base/db/proc.test.ts` - SQLite 操作

### 集成测试
```graphql
# 1. 启动服务器
# bun run index.ts

# 2. GraphQL Playground: http://localhost:3000/graphql

# 3. 测试 Mutation
mutation {
  createProject(input: {
    inputType: TEXT
    inputContent: "a cute cat girl with cat ears"
    styleId: "anime-style"
  }) {
    project {
      id
      status
    }
  }
}

# 4. 测试 Subscription
subscription {
  projectProgress(projectId: "project-id-here") {
    projectId
    status
    completedCount
    totalCount
    latestImage {
      id
      emotionType
      fileUrl
      status
    }
  }
}

# 5. 测试 Query
query {
  project(id: "project-id-here") {
    id
    status
    images {
      id
      emotionType
      fileUrl
      status
    }
  }
}
```

## 关键决策记录

### 1. GraphQL over REST
- **决策**：使用 GraphQL + Subscription
- **理由**：Bun 原生支持，体验现代技术栈，Subscription 优于轮询
- **代价**：略微增加复杂度，但周末项目可接受

### 2. 手写 SQL over ORM
- **决策**：直接使用 Bun SQLite API，手写 SQL
- **理由**：简单场景无需 ORM，减少依赖，更好控制
- **代价**：类型安全略弱，需要手动维护 schema

### 3. 四张表设计
- **决策**：User/Project/Image/Style 四张表
- **理由**：避免 JSON blob，保持可读性，不增加复杂 JOIN
- **代价**：需要维护外键关系，但心智负担可控

### 4. 不做适配器抽象
- **决策**：直接硬编码 Google Nano Banana API
- **理由**：YAGNI，第一版只用一个 API
- **代价**：未来换 API 需要改代码，但可接受

### 5. 内存版 PubSub
- **决策**：不用 Redis，内存实现
- **理由**：单实例部署足够，避免外部依赖
- **代价**：重启后 Subscription 断开，但可重连

### 6. MVP 只做 9 张情绪
- **决策**：第一个垂直切片只实现情绪表情
- **理由**：验证核心流程，快速迭代
- **代价**：功能不完整，但符合 MVP 目标

## 下一步扩展

### Phase 6: 7 张意外表情
- 扩展 `surprises.json`（50+ 动作场景）
- `PromptBuilder.buildSurprise()` 随机抽取
- `Image.surpriseIndex` 字段启用

### Phase 7: 图片输入支持
- 上传接口：`POST /api/upload`
- Base64 编码存储到 `projects.input_content`
- 传递给 Google Nano Banana 作为参考图

### Phase 8: 混合输入
- 文字 + 图片组合
- Prompt 构造逻辑调整

### Phase 9: 认证系统
- 引入 Better Auth
- `users` 表启用
- JWT token 验证

### Phase 10: ORM 迁移
- 考虑 Drizzle ORM
- 类型安全查询
- 迁移管理
