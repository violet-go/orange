# Phase 3 开发指令

## 📍 当前状态

✅ **Phase 1 已完成** (commit: 624fdea)
- base/config, logger, db, storage, pubsub 全部实现
- 18 个测试全部通过

✅ **Phase 2 已完成**
- core/prompt, image, gen 全部实现
- 12 个测试全部通过，执行时间 2.93s
- Mock 模式完整生成流程验证

## 🎯 Phase 3 目标

实现 **GraphQL API 层**，暴露 Query/Mutation/Subscription 接口。

**验收标准**：11 个测试通过，GraphQL Playground 可访问，Subscription 连接稳定

---

## 🚀 快速启动步骤

### Step 1: 阅读上下文 (2 分钟)

```bash
# 必读文件
cat .ctx/feature-design.md | sed -n '/GraphQL Schema/,/## 架构设计/p'  # Schema 定义
cat .ctx/feature-design.md | sed -n '/GraphQL Resolvers/,/## 开发路线图/p'  # Resolver 实现
cat .ctx/acceptance-criteria.md | sed -n '/Phase 3/,/Phase 4/p'  # 验收条件
```

**关键理解**：
- GraphQL Yoga 5.x - Bun 原生支持，内置 Subscription
- Hono 作为 HTTP 框架，集成 GraphQL Yoga
- Schema-first 设计：先定义类型，再实现 Resolver
- Subscription 通过内存 PubSub 实现（Phase 1 已完成）

### Step 2: port/graphql/schema - GraphQL Schema 定义 (30 分钟)

**实现文件**：
1. `port/graphql/schema.ts` - GraphQL SDL 定义

**参考代码**：`.ctx/feature-design.md` 第 134-230 行

**Schema 要点**：
```graphql
type Query {
  project(id: ID!): Project
  styles: [Style!]!
}

type Mutation {
  createProject(input: CreateProjectInput!): CreateProjectPayload!
}

type Subscription {
  projectProgress(projectId: ID!): ProjectProgressUpdate!
}
```

**核心类型**：
- `Project`: id, inputType, inputContent, status, images, timestamps
- `Image`: id, category, emotionType, prompt, fileUrl, status, metadata
- `Style`: id, displayName, description, promptTemplate
- `ProjectProgressUpdate`: projectId, status, completedCount, totalCount, latestImage

**自主验证**：
```bash
# 语法检查（如果有 graphql-cli）
npx graphql-schema-linter port/graphql/schema.ts
```

### Step 3: port/graphql/resolvers - Resolver 实现 (45 分钟)

**实现文件**：
1. `port/graphql/resolvers.ts` - Query/Mutation/Subscription Resolver
2. `port/graphql/context.ts` - GraphQL Context 类型定义

**参考代码**：`.ctx/feature-design.md` 第 724-781 行

**Resolver 要点**：
```typescript
// Query Resolvers
Query: {
  project: (_, { id }, ctx) => ctx.db.getProject(id),
  styles: (_, __, ctx) => ctx.db.getActiveStyles()
}

// Mutation Resolvers
Mutation: {
  createProject: async (_, { input }, ctx) => {
    const projectId = await ctx.genService.generate(input)
    return { project: ctx.db.getProject(projectId) }
  }
}

// Subscription Resolvers
Subscription: {
  projectProgress: {
    subscribe: (_, { projectId }, ctx) =>
      ctx.pubsub.subscribe(`project:${projectId}`),
    resolve: (payload) => payload
  }
}

// Field Resolvers
Project: {
  images: (project, _, ctx) => ctx.db.getImagesByProject(project.id)
}

Image: {
  fileUrl: (image) => `/${image.filePath}`
}
```

**Context 类型**：
```typescript
export interface GraphQLContext {
  db: Database
  genService: GenService
  pubsub: PubSub
  logger: Logger
}
```

**自主验证**：
```bash
# TypeScript 编译检查
bun build port/graphql/resolvers.ts --target=bun
```

### Step 4: index.ts - Hono + GraphQL Yoga 集成 (30 分钟)

**实现文件**：
1. `index.ts` - 服务器入口，集成所有模块

**参考代码**：`.ctx/feature-design.md` 未明确给出，需根据 Hono + GraphQL Yoga 最佳实践实现

**集成要点**：
```typescript
import { Hono } from 'hono'
import { createYoga } from 'graphql-yoga'
import { createSchema } from 'graphql-yoga'

// 1. 初始化所有依赖
const config = loadConfig()
const logger = createLogger()
const db = createDatabase({ path: config.dbPath, logger })
const storage = createStorage({ basePath: config.storagePath })
const pubsub = createPubSub()
const promptBuilder = createPromptBuilder()
const imageGen = createMockImageGen({ delay: 50 })
const genService = createGenService({ db, storage, imageGen, promptBuilder, pubsub, logger })

// 2. 创建 GraphQL Yoga 实例
const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL SDL */,
    resolvers: createResolvers({ db, genService, pubsub, logger })
  }),
  context: { db, genService, pubsub, logger }
})

// 3. 创建 Hono 应用
const app = new Hono()

// 4. GraphQL 端点
app.all('/graphql', async (c) => {
  const response = await yoga.fetch(c.req.raw, {
    db, genService, pubsub, logger
  })
  return response
})

// 5. 静态文件服务
app.get('/data/images/*', async (c) => {
  const path = c.req.path.replace('/data/', '')
  const buffer = await storage.read(path)
  return new Response(buffer, {
    headers: { 'Content-Type': 'image/png' }
  })
})

// 6. 启动服务器
export default {
  port: config.port,
  fetch: app.fetch
}
```

**自主验证**：
```bash
# 启动服务器
bun run index.ts

# 另一个终端测试
curl http://localhost:3000/graphql
```

### Step 5: 手动测试 GraphQL Playground (15 分钟)

**测试用例**：

```graphql
# 1. Query: 查询可用风格
query {
  styles {
    id
    displayName
    description
  }
}

# 2. Mutation: 创建 Project
mutation {
  createProject(input: {
    inputType: TEXT
    inputContent: "a cute cat girl with cat ears"
  }) {
    project {
      id
      status
      inputType
      inputContent
    }
  }
}

# 3. Query: 查询 Project 详情
query {
  project(id: "刚才创建的 project id") {
    id
    status
    images {
      id
      emotionType
      status
      fileUrl
    }
  }
}

# 4. Subscription: 订阅进度更新
subscription {
  projectProgress(projectId: "project id") {
    projectId
    status
    completedCount
    totalCount
    latestImage {
      id
      emotionType
      status
    }
  }
}
```

**验收点**：
- ✓ GraphQL Playground 在 http://localhost:3000/graphql 可访问
- ✓ Query.styles 返回空数组（暂无预设风格）
- ✓ Mutation.createProject 创建成功，立即返回 pending 状态
- ✓ Query.project 可查询到创建的 Project
- ✓ Subscription 能建立 WebSocket 连接
- ✓ 等待 1-2 秒后，Subscription 推送进度更新

### Step 6: 自动化测试（可选，建议 Phase 4 再做）

**Phase 3 验收主要依赖手动测试**，因为：
1. GraphQL 集成测试需要启动完整服务器
2. Subscription 测试需要 WebSocket 客户端
3. 这些属于 E2E 测试，Phase 4 更合适

**如果要做自动化测试**：
```bash
# 创建测试文件
mkdir -p test/phase3
touch test/phase3/graphql-server.test.ts
touch test/phase3/mutation.test.ts
touch test/phase3/subscription.test.ts
```

---

## 🔑 关键原则

1. **Schema-First 设计** - 先定义 GraphQL Schema，确保类型安全
2. **Context 注入** - 通过 Context 传递依赖，避免全局变量
3. **Field Resolver** - 使用 Field Resolver 延迟加载关联数据
4. **错误处理** - GraphQL 错误统一返回，HTTP 500 只用于服务器崩溃
5. **手动测试优先** - Phase 3 重点是"能跑通"，不强求测试覆盖

## 🎯 成功标准

今天结束时应该达到：
- ✅ GraphQL Playground 可访问
- ✅ 能通过 Mutation 创建 Project
- ✅ 能通过 Query 查询 Project
- ✅ 能通过 Subscription 订阅进度
- ✅ 静态图片文件可通过 HTTP 访问

## 💡 快速命令

```bash
# 启动开发
cd /home/violet/proj/orange

# 查看 Phase 3 验收条件
cat .ctx/acceptance-criteria.md | sed -n '/Phase 3/,/Phase 4/p'

# 启动服务器
bun run index.ts

# 访问 GraphQL Playground
open http://localhost:3000/graphql

# 查看 Git 状态
git status
```

---

## 📚 技术栈参考

- **Hono**: https://hono.dev/
- **GraphQL Yoga**: https://the-guild.dev/graphql/yoga-server
- **GraphQL**: https://graphql.org/learn/

**Bun 原生 API**：
- `Bun.serve()` - HTTP 服务器
- WebSocket 内置支持 Subscription

---

**预计时间**：2-3 小时
**当前时间**：2025-10-01 18:23

Phase 2 ✅ 完成，开始 Phase 3！🚀
