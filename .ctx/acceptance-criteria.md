# PeelPack MVP 验收条件（Acceptance Criteria）

## 核心问题：什么叫"完成"？

每个 Phase 的验收条件应该回答三个问题：
1. **能跑吗？** - 基本功能可执行
2. **对吗？** - 输出符合预期
3. **怎么证明？** - 可重复的验证方法

## 验收条件设计原则

1. **可测试性** - 每个条件都能自动化验证
2. **明确性** - 清晰的输入/输出/预期
3. **独立性** - Phase N 不依赖 Phase N+1
4. **渐进性** - 从简单到复杂，从 mock 到真实
5. **可重复性** - 任何人任何时候都能验证

## Phase 1: 基础设施 - 地基打牢了吗？

### 任务清单

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

### 验收条件

#### 4. Config 配置加载

**问题**：如何验证"配置加载"成功？

**验收标准**：
```typescript
// test/phase1/config.test.ts
const config = loadConfig()

// ✓ 能读取 .env 配置
assert(config.port === 3000)
assert(config.nanoBananaApiKey !== undefined)
assert(config.dbPath !== undefined)

// ✓ 缺少必需配置应该抛出错误
delete process.env.NANO_BANANA_API_KEY
assert.throws(() => loadConfig())

// ✓ 配置类型正确
assert(typeof config.port === 'number')
assert(typeof config.nanoBananaApiKey === 'string')
```

**执行验证**：
```bash
bun test base/config/proc.test.ts
```

#### 5. Logger 5-level 日志

**问题**：如何验证五个级别都正常工作？

**验收标准**：
```typescript
// test/phase1/logger.test.ts
const logger = createLogger()

// ✓ 五个级别都能输出
logger.debug('test')  // 灰色输出
logger.info('test')   // 青色输出
logger.warn('test')   // 黄色输出
logger.error('test')  // 红色输出
logger.fatal('test')  // 红底白字 + crash.log

// ✓ 子 logger 能继承
const child = logger.child('test-module')
child.info('test')    // 应该有 [test-module] 前缀

// ✓ 日志级别过滤
const prodLogger = createLogger({ level: 'info' })
// debug 不应该输出，info 及以上应该输出
```

**执行验证**：
```bash
bun test base/logger/proc.test.ts
# 手动检查控制台颜色输出
```

#### 6. Database 数据库初始化

**问题**：schema.sql 执行成功？表和索引都创建了？

**验收标准**：
```typescript
// test/phase1/db.test.ts
const db = createDatabase({ path: ':memory:', logger })

// ✓ 四张表都创建了
const tables = db.query(`
  SELECT name FROM sqlite_master
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
`).all()
assert(tables.length === 4)
assert(tables.some(t => t.name === 'users'))
assert(tables.some(t => t.name === 'projects'))
assert(tables.some(t => t.name === 'images'))
assert(tables.some(t => t.name === 'styles'))

// ✓ 索引都建立了
const indexes = db.query(`
  SELECT name FROM sqlite_master
  WHERE type='index' AND name NOT LIKE 'sqlite_%'
`).all()
assert(indexes.length >= 4)

// ✓ 能插入和查询数据
db.createProject({
  id: 'test-id',
  inputType: 'text',
  inputContent: 'test content',
  seed: 12345,
  status: 'pending'
})
const project = db.getProject('test-id')
assert(project.id === 'test-id')
assert(project.inputType === 'text')

// ✓ 外键约束生效
assert.throws(() => {
  db.createProject({
    id: 'test-2',
    userId: 'non-existent-user',  // 违反外键
    inputType: 'text',
    inputContent: 'test',
    seed: 123,
    status: 'pending'
  })
})
```

**执行验证**：
```bash
bun test base/db/proc.test.ts
```

#### 7. Storage 文件系统操作

**问题**：能创建目录、写入文件、读取文件？

**验收标准**：
```typescript
// test/phase1/storage.test.ts
const storage = createStorage({ basePath: './test-data' })

// ✓ 能写入文件
const buffer = Buffer.from('test image data')
await storage.save('images/test/img.png', buffer)

// ✓ 文件确实存在
const exists = await storage.exists('images/test/img.png')
assert(exists === true)

// ✓ 能读取文件
const readBuffer = await storage.read('images/test/img.png')
assert(readBuffer.equals(buffer))

// ✓ 路径不存在会自动创建
await storage.save('deep/nested/path/file.png', buffer)
assert(await storage.exists('deep/nested/path/file.png'))

// ✓ 能删除文件
await storage.delete('images/test/img.png')
assert(!(await storage.exists('images/test/img.png')))

// 清理测试数据
await fs.rm('./test-data', { recursive: true })
```

**执行验证**：
```bash
bun test base/storage/proc.test.ts
```

#### 8. PubSub 内存发布订阅

**问题**：能订阅、发布、取消订阅？

**验收标准**：
```typescript
// test/phase1/pubsub.test.ts
const pubsub = createPubSub()
const messages: any[] = []

// ✓ 能订阅和接收消息
const subscription = pubsub.subscribe('test-channel')
;(async () => {
  for await (const msg of subscription) {
    messages.push(msg)
    if (messages.length >= 3) break
  }
})()

await pubsub.publish('test-channel', { data: 'message-1' })
await pubsub.publish('test-channel', { data: 'message-2' })
await pubsub.publish('test-channel', { data: 'message-3' })

await sleep(100)
assert(messages.length === 3)
assert(messages[0].data === 'message-1')
assert(messages[2].data === 'message-3')

// ✓ 多个订阅者都能收到
const messages2: any[] = []
const subscription2 = pubsub.subscribe('test-channel')
;(async () => {
  for await (const msg of subscription2) {
    messages2.push(msg)
    if (messages2.length >= 1) break
  }
})()

await pubsub.publish('test-channel', { data: 'broadcast' })
await sleep(100)
assert(messages2.length === 1)
assert(messages2[0].data === 'broadcast')
```

**执行验证**：
```bash
bun test base/pubsub/proc.test.ts
```

### Phase 1 整体验收

**单一入口脚本**：
```bash
bun test:phase1
```

**期望输出**：
```text
✓ Config loads from .env
✓ Config throws on missing required fields
✓ Logger outputs 5 levels with colors
✓ Logger child() creates scoped logger
✓ Database creates 4 tables with indexes
✓ Database enforces foreign key constraints
✓ Storage saves and reads files
✓ Storage creates nested directories
✓ PubSub publishes and subscribes
✓ PubSub supports multiple subscribers
✓ All base modules initialized successfully

Tests: 11 passed, 11 total
Time: ~1s
```

---

## Phase 2: 核心逻辑 - 业务流程通了吗？

### 任务清单

```bash
✓ 9. core/prompt: emotions.json + PromptBuilder
✓ 10. core/image: Google Nano Banana 调用（先 mock）
✓ 11. core/gen: GenService orchestration
✓ 12. 测试：createProject → 9 个 Image pending
```

### 验收条件

#### 9. PromptBuilder Prompt 构造器

**问题**：9 种情绪都能构造？组合逻辑正确？

**验收标准**：
```typescript
// test/phase2/prompt.test.ts
const builder = createPromptBuilder()

// ✓ 能构造单个情绪 Prompt
const happyPrompt = builder.buildEmotion({
  basePrompt: 'a cute cat girl',
  emotionType: 'happy'
})
assert(happyPrompt.includes('a cute cat girl'))
assert(happyPrompt.includes('happy expression'))
assert(happyPrompt.includes('bright eyes'))

// ✓ 能构造所有 9 种情绪
const prompts = builder.buildAllEmotions('a cute cat girl')
assert(prompts.length === 9)

const emotionTypes = prompts.map(p => p.emotionType)
assert(emotionTypes.includes('happy'))
assert(emotionTypes.includes('sad'))
assert(emotionTypes.includes('angry'))
assert(emotionTypes.includes('surprised'))
assert(emotionTypes.includes('thinking'))
assert(emotionTypes.includes('shy'))
assert(emotionTypes.includes('proud'))
assert(emotionTypes.includes('tired'))
assert(emotionTypes.includes('love'))

// ✓ 每个 Prompt 都包含基础内容
assert(prompts.every(p => p.prompt.includes('a cute cat girl')))

// ✓ 顺序稳定（相同输入总是相同顺序）
const prompts2 = builder.buildAllEmotions('a cute cat girl')
assert.deepEqual(
  prompts.map(p => p.emotionType),
  prompts2.map(p => p.emotionType)
)
```

**执行验证**：
```bash
bun test core/prompt/proc.test.ts
```

#### 10. ImageGen Mock 图片生成

**问题**：返回格式正确？能模拟延迟和失败？

**验收标准**：
```typescript
// test/phase2/image-gen.test.ts

// ✓ Mock 返回格式正确
const mockGen = createMockImageGen()
const result = await mockGen.generate({
  prompt: 'test prompt',
  seed: 12345
})

assert(result.imageBuffer instanceof Buffer)
assert(result.imageBuffer.length > 0)
assert(result.width === 512)
assert(result.height === 512)
assert(result.metadata !== undefined)

// ✓ 能模拟延迟
const slowGen = createMockImageGen({ delay: 1000 })
const start = Date.now()
await slowGen.generate({ prompt: 'test' })
const elapsed = Date.now() - start
assert(elapsed >= 1000)

// ✓ 能模拟失败
const failGen = createMockImageGen({ failRate: 1.0 })
await assert.rejects(
  failGen.generate({ prompt: 'test' }),
  /Mock generation failed/
)

// ✓ 能模拟部分失败
const flakyGen = createMockImageGen({ failRate: 0.5 })
let failures = 0
for (let i = 0; i < 10; i++) {
  try {
    await flakyGen.generate({ prompt: 'test' })
  } catch {
    failures++
  }
}
// 大约 50% 失败
assert(failures >= 3 && failures <= 7)
```

**执行验证**：
```bash
bun test core/image/proc.test.ts
```

#### 11. GenService Orchestration

**问题**：创建 Project？创建 9 个 Image？立即返回？后台异步执行？

**验收标准**：
```typescript
// test/phase2/gen-service.test.ts
const db = createDatabase({ path: ':memory:', logger })
const storage = createStorage({ basePath: './test-data' })
const mockImageGen = createMockImageGen({ delay: 100 })
const promptBuilder = createPromptBuilder()
const pubsub = createPubSub()

const genService = createGenService({
  db,
  storage,
  imageGen: mockImageGen,
  promptBuilder,
  pubsub,
  logger
})

// ✓ 立即返回 projectId
const start = Date.now()
const projectId = await genService.generate({
  inputType: 'text',
  inputContent: 'a cute cat girl'
})
const elapsed = Date.now() - start

assert(typeof projectId === 'string')
assert(elapsed < 100)  // 应该几乎立即返回

// ✓ 数据库应该有 Project 记录
const project = await db.getProject(projectId)
assert(project !== null)
assert(project.id === projectId)
assert(project.inputType === 'text')
assert(project.inputContent === 'a cute cat girl')
assert(['pending', 'generating'].includes(project.status))

// ✓ 数据库应该有 9 个 Image 记录
const images = await db.getImagesByProject(projectId)
assert(images.length === 9)
assert(images.every(img => img.category === 'emotion'))
assert(images.every(img => img.status === 'pending'))

// 验证 9 种情绪都有
const emotionTypes = images.map(img => img.emotionType).sort()
assert.deepEqual(emotionTypes, [
  'angry', 'happy', 'love', 'proud',
  'sad', 'shy', 'surprised', 'thinking', 'tired'
])

// ✓ 等待异步生成完成
await sleep(2000)  // 9 * 100ms + 缓冲

const updatedProject = await db.getProject(projectId)
assert(updatedProject.status === 'completed')

const updatedImages = await db.getImagesByProject(projectId)
assert(updatedImages.every(img => img.status === 'success'))

// ✓ 文件应该都存在
for (const img of updatedImages) {
  const exists = await storage.exists(img.filePath.replace('data/', ''))
  assert(exists === true)
}

// 清理
await fs.rm('./test-data', { recursive: true })
```

**执行验证**：
```bash
bun test core/gen/proc.test.ts
```

#### 12. 重试逻辑验证

**问题**：失败后重试？使用不同 seed？

**验收标准**：
```typescript
// test/phase2/retry-logic.test.ts

// 创建一个"第一次失败，第二次成功"的 mock
let callCount = 0
const retryableGen = createMockImageGen({
  customBehavior: () => {
    callCount++
    if (callCount <= 3) {
      throw new Error('Simulated failure')
    }
    return { /* success */ }
  }
})

const genService = createGenService({
  imageGen: retryableGen,
  // ... other deps
})

const projectId = await genService.generate({
  inputType: 'text',
  inputContent: 'test'
})

// 等待完成
await sleep(3000)

const images = await db.getImagesByProject(projectId)

// ✓ 部分图片重试了
const retriedImages = images.filter(img => img.retryCount > 0)
assert(retriedImages.length > 0)
assert(retriedImages.length <= 3)  // 最多 3 个失败

// ✓ 重试的图片最终成功
assert(retriedImages.every(img => img.status === 'success'))

// ✓ Project 状态正确
const project = await db.getProject(projectId)
assert(project.status === 'completed')
```

**执行验证**：
```bash
bun test core/gen/retry.test.ts
```

### Phase 2 整体验收

**单一入口脚本**：
```bash
bun test:phase2
```

**期望输出**：
```text
✓ PromptBuilder generates 9 emotion prompts
✓ PromptBuilder combines base + emotion correctly
✓ PromptBuilder output order is stable
✓ Mock ImageGen returns valid image data
✓ Mock ImageGen simulates delay
✓ Mock ImageGen simulates failures
✓ GenService creates Project + 9 Images
✓ GenService returns projectId immediately
✓ Async generation completes all images
✓ Failed images retry once with different seed
✓ Retry logic uses different seed
✓ Project status updates correctly

Tests: 12 passed, 12 total
Time: ~3s
```

---

## Phase 3: GraphQL 层 - 接口能调通吗？

### 任务清单

```bash
✓ 13. port/graphql/schema: 定义 GraphQL Schema
✓ 14. port/graphql/resolvers: Query/Mutation/Subscription
✓ 15. index.ts: Hono + GraphQL Yoga 集成
✓ 16. 测试：GraphQL Playground 手动测试
```

### 验收条件

#### 13-15. GraphQL Server 集成

**问题**：服务器能启动？GraphQL 端点能访问？

**验收标准**：

```bash
# ✓ 服务器能启动
bun run index.ts &
sleep 2

# 应该输出：
# [info] Server running on :3000
# [info] GraphQL endpoint: /graphql

# ✓ GraphQL Playground 能访问
curl -s http://localhost:3000/graphql | grep -q "GraphQL Playground"
echo "✓ GraphQL Playground accessible"

# ✓ Introspection 查询成功
INTROSPECTION=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}')

echo "$INTROSPECTION" | grep -q "Project"
echo "$INTROSPECTION" | grep -q "Image"
echo "$INTROSPECTION" | grep -q "Style"
echo "✓ Introspection query succeeds"

# ✓ Query.styles 能执行
STYLES=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ styles { id displayName } }"}')

echo "$STYLES" | grep -q '"data"'
echo "✓ Query.styles returns data"

# ✓ Mutation.createProject 能执行
CREATE=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }",
    "variables": {
      "input": {
        "inputType": "TEXT",
        "inputContent": "test cat girl"
      }
    }
  }')

PROJECT_ID=$(echo "$CREATE" | jq -r '.data.createProject.project.id')
echo "✓ Mutation.createProject creates project: $PROJECT_ID"

# ✓ Query.project 能查询
PROJECT=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"{ project(id: \\\"$PROJECT_ID\\\") { id status images { id status } } }\"
  }")

echo "$PROJECT" | grep -q "$PROJECT_ID"
echo "✓ Query.project returns project data"

# 停止服务器
pkill -f "bun.*index.ts"
```

**执行验证**：
```bash
bun test:phase3:server
```

#### 16. GraphQL 错误处理

**问题**：缺少参数？类型错误？资源不存在？

**验收标准**：

```graphql
# ✓ 缺少必需参数应该返回错误
mutation {
  createProject(input: {
    inputType: TEXT
    # 缺少 inputContent
  }) {
    project { id }
  }
}
# 期望：GraphQL 验证错误
# "Field \"inputContent\" of required type \"String!\" was not provided."

# ✓ 类型错误应该返回错误
mutation {
  createProject(input: {
    inputType: "INVALID_TYPE"
    inputContent: "test"
  }) {
    project { id }
  }
}
# 期望：Enum 验证错误

# ✓ 查询不存在的资源返回 null
query {
  project(id: "non-existent-id") {
    id
  }
}
# 期望：{ "data": { "project": null } }

# ✓ 无效 styleId 应该忽略或报错
mutation {
  createProject(input: {
    inputType: TEXT
    inputContent: "test"
    styleId: "non-existent-style"
  }) {
    project { id }
  }
}
# 期望：成功创建但忽略无效 styleId，或返回友好错误
```

**执行验证**：
```bash
# 手动在 GraphQL Playground 测试
# 或使用自动化脚本
bun test:phase3:errors
```

#### Subscription 测试

**问题**：WebSocket 连接能建立？能接收实时更新？

**验收标准**：

```typescript
// test/phase3/subscription.test.ts
import { createClient } from 'graphql-ws'
import WebSocket from 'ws'

const client = createClient({
  url: 'ws://localhost:3000/graphql',
  webSocketImpl: WebSocket
})

// ✓ 能建立 Subscription 连接
const updates: any[] = []

const unsubscribe = client.subscribe(
  {
    query: `
      subscription($projectId: ID!) {
        projectProgress(projectId: $projectId) {
          projectId
          status
          completedCount
          totalCount
        }
      }
    `,
    variables: { projectId: 'test-project-id' }
  },
  {
    next: (data) => updates.push(data),
    error: (err) => console.error(err),
    complete: () => console.log('complete')
  }
)

// 触发一些更新
await pubsub.publish('project:test-project-id', {
  projectId: 'test-project-id',
  status: 'generating',
  completedCount: 1,
  totalCount: 9
})

await sleep(100)

// ✓ 应该收到更新
assert(updates.length > 0)
assert(updates[0].data.projectProgress.projectId === 'test-project-id')

unsubscribe()
```

**执行验证**：
```bash
bun test core/subscription.test.ts
```

### Phase 3 整体验收

**单一入口脚本**：
```bash
bun test:phase3
```

**期望输出**：
```text
✓ Server starts on port 3000
✓ GraphQL Playground accessible
✓ Introspection query succeeds
✓ Query.styles returns array
✓ Query.project returns project data
✓ Mutation.createProject creates project
✓ Subscription.projectProgress establishes connection
✓ Subscription receives real-time updates
✓ Error: missing required field
✓ Error: invalid enum value
✓ Error: non-existent resource returns null

Tests: 11 passed, 11 total
Time: ~5s
```

---

## Phase 4: 真实集成 - 能生成真图吗？

### 任务清单

```bash
✓ 17. core/image: 替换为真实 Google Nano Banana API
✓ 18. 端到端测试：文字输入 → 9 张图片生成
✓ 19. Subscription 测试：实时进度推送
✓ 20. 错误处理和重试逻辑验证
```

### 验收条件

#### 17. 真实 API 连接

**问题**：API Key 配置正确？网络连接正常？返回格式符合预期？

**验收标准**：

```typescript
// test/phase4/real-api.test.ts

// ✓ API 连接成功
const imageGen = createImageGen({
  apiKey: process.env.NANO_BANANA_API_KEY!,
  baseUrl: process.env.NANO_BANANA_BASE_URL!,
  logger
})

const result = await imageGen.generate({
  prompt: 'a red apple on white background, simple, minimal'
})

// ✓ 返回真实图片数据
assert(result.imageBuffer.length > 0)
assert(result.imageBuffer.length > 10000)  // 至少 10KB
assert(result.width > 0)
assert(result.height > 0)

// ✓ 验证是否真的是图片（PNG magic number）
assert(result.imageBuffer[0] === 0x89)
assert(result.imageBuffer[1] === 0x50)
assert(result.imageBuffer[2] === 0x4E)
assert(result.imageBuffer[3] === 0x47)

// ✓ 保存图片并验证
await storage.save('test/apple.png', result.imageBuffer)
const saved = await storage.read('test/apple.png')
assert(saved.length === result.imageBuffer.length)

console.log(`✓ Generated real image: ${result.width}x${result.height}, ${result.imageBuffer.length} bytes`)
```

**执行验证**：
```bash
# 需要真实 API Key
export NANO_BANANA_API_KEY=your_key_here
bun test:phase4:api-connection
```

#### 18. 端到端测试

**问题**：9 张图片都生成了？文件存在？数据库状态正确？

**验收标准**：

```bash
#!/bin/bash
# test/phase4/e2e-test.sh

echo "🚀 Starting E2E test..."

# 1. 启动服务器
bun run index.ts &
SERVER_PID=$!
sleep 3

# 2. 创建 Project
echo "📝 Creating project..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createProject(input: { inputType: TEXT, inputContent: \"a cute cat girl with cat ears, anime style\" }) { project { id } } }"
  }')

PROJECT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.createProject.project.id')
echo "✓ Project created: $PROJECT_ID"

# 3. 等待生成完成（最多 90 秒）
echo "⏳ Waiting for generation (max 90s)..."
for i in {1..18}; do
  sleep 5

  STATUS_RESPONSE=$(curl -s -X POST http://localhost:3000/graphql \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"{ project(id: \\\"$PROJECT_ID\\\") { status images { status } } }\"
    }")

  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.project.status')
  echo "  [${i}] Status: $STATUS"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "partial_failed" ]; then
    break
  fi
done

# 4. 验证最终状态
FINAL_RESPONSE=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"{ project(id: \\\"$PROJECT_ID\\\") { status images { id status emotionType fileUrl } } }\"
  }")

FINAL_STATUS=$(echo "$FINAL_RESPONSE" | jq -r '.data.project.status')
SUCCESS_COUNT=$(echo "$FINAL_RESPONSE" | jq '[.data.project.images[] | select(.status == "SUCCESS")] | length')
FAILED_COUNT=$(echo "$FINAL_RESPONSE" | jq '[.data.project.images[] | select(.status == "FAILED")] | length')

echo "✓ Final status: $FINAL_STATUS"
echo "✓ Success: $SUCCESS_COUNT/9"
echo "✓ Failed: $FAILED_COUNT/9"

# 5. 验证文件存在
echo "📁 Verifying files..."
IMAGES=$(echo "$FINAL_RESPONSE" | jq -r '.data.project.images[].id')
FILE_COUNT=0
for IMAGE_ID in $IMAGES; do
  FILE_PATH="data/images/$PROJECT_ID/$IMAGE_ID.png"
  if [ -f "$FILE_PATH" ]; then
    FILE_SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH")
    echo "  ✓ $IMAGE_ID.png ($FILE_SIZE bytes)"
    FILE_COUNT=$((FILE_COUNT + 1))
  fi
done

echo "✓ Files found: $FILE_COUNT/9"

# 6. 验证图片可访问
echo "🌐 Verifying HTTP access..."
FIRST_IMAGE_ID=$(echo "$IMAGES" | head -n 1)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:3000/data/images/$PROJECT_ID/$FIRST_IMAGE_ID.png")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Image accessible via HTTP"
else
  echo "✗ HTTP access failed: $HTTP_STATUS"
fi

# 7. 停止服务器
kill $SERVER_PID

# 8. 汇总结果
echo ""
echo "========================================="
if [ "$SUCCESS_COUNT" -ge 8 ] && [ "$FILE_COUNT" -ge 8 ]; then
  echo "✅ E2E Test PASSED"
  echo "   - Status: $FINAL_STATUS"
  echo "   - Generated: $SUCCESS_COUNT/9 images"
  echo "   - Files: $FILE_COUNT/9 found"
  exit 0
else
  echo "❌ E2E Test FAILED"
  exit 1
fi
```

**执行验证**：
```bash
chmod +x test/phase4/e2e-test.sh
bun test:phase4:e2e
```

#### 19. Subscription 实时推送

**问题**：每完成一张推送一次？进度递增？

**验收标准**：

```typescript
// test/phase4/subscription-e2e.test.ts
import { createClient } from 'graphql-ws'
import WebSocket from 'ws'

// 1. 建立 Subscription 连接
const client = createClient({
  url: 'ws://localhost:3000/graphql',
  webSocketImpl: WebSocket
})

// 2. 创建 Project
const createResponse = await fetch('http://localhost:3000/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `mutation {
      createProject(input: {
        inputType: TEXT
        inputContent: "test"
      }) {
        project { id }
      }
    }`
  })
})

const { data } = await createResponse.json()
const projectId = data.createProject.project.id

// 3. 订阅进度更新
const updates: any[] = []

await new Promise((resolve) => {
  client.subscribe(
    {
      query: `
        subscription($projectId: ID!) {
          projectProgress(projectId: $projectId) {
            projectId
            status
            completedCount
            totalCount
            latestImage { id emotionType }
          }
        }
      `,
      variables: { projectId }
    },
    {
      next: (data) => {
        updates.push(data.data.projectProgress)

        // 完成后 resolve
        if (data.data.projectProgress.status === 'completed') {
          resolve(true)
        }
      },
      error: (err) => console.error(err),
      complete: () => resolve(true)
    }
  )
})

// 4. 验证推送
// ✓ 应该收到多次更新
assert(updates.length >= 9)
console.log(`✓ Received ${updates.length} progress updates`)

// ✓ completedCount 应该递增
for (let i = 1; i < updates.length; i++) {
  assert(updates[i].completedCount >= updates[i - 1].completedCount)
}
console.log('✓ Progress increments correctly')

// ✓ 最终状态应该是 completed
assert(updates[updates.length - 1].status === 'completed')
console.log('✓ Final status is completed')

// ✓ 每次更新应该包含最新完成的图片
const updatesWithImage = updates.filter(u => u.latestImage !== null)
assert(updatesWithImage.length >= 8)
console.log(`✓ ${updatesWithImage.length} updates included latest image`)
```

**执行验证**：
```bash
bun test:phase4:subscription
```

#### 20. 错误处理和重试

**问题**：如何模拟 API 失败？重试是否生效？

**验收标准**：

```typescript
// test/phase4/retry-real.test.ts

// 创建一个包装器，模拟部分请求失败
let requestCount = 0
const originalFetch = global.fetch

global.fetch = async (url, options) => {
  requestCount++

  // 前 3 个请求失败
  if (requestCount <= 3) {
    throw new Error('Simulated network error')
  }

  // 后续请求正常
  return originalFetch(url, options)
}

// 执行生成
const genService = createGenService({ /* real deps */ })
const projectId = await genService.generate({
  inputType: 'text',
  inputContent: 'test'
})

// 等待完成
await sleep(120000)  // 2 分钟

// 验证
const images = await db.getImagesByProject(projectId)

// ✓ 部分图片重试了
const retriedImages = images.filter(img => img.retryCount > 0)
assert(retriedImages.length >= 3)
console.log(`✓ ${retriedImages.length} images retried`)

// ✓ 重试后成功
const successImages = images.filter(img => img.status === 'success')
assert(successImages.length >= 6)
console.log(`✓ ${successImages.length} images succeeded`)

// ✓ Project 最终状态
const project = await db.getProject(projectId)
assert(['completed', 'partial_failed'].includes(project.status))
console.log(`✓ Final status: ${project.status}`)

// 恢复原始 fetch
global.fetch = originalFetch
```

**执行验证**：
```bash
bun test:phase4:retry
```

### Phase 4 整体验收

**单一入口脚本**：
```bash
bun test:phase4
```

**期望输出**：
```text
✓ Google Nano Banana API connection successful
✓ Single image generation works
✓ Generated image is valid PNG
✓ E2E: Project created
✓ E2E: 9/9 images generated in <90s
✓ E2E: All image files exist on filesystem
✓ E2E: All images are valid PNG
✓ E2E: Database status updated correctly
✓ E2E: Images accessible via HTTP
✓ Subscription: Received 9+ progress updates
✓ Subscription: Progress increments correctly
✓ Subscription: Final status is completed
✓ Retry: Failed images retry with different seed
✓ Retry: Retried images eventually succeed

Tests: 14 passed, 14 total
Time: ~120s
```

---

## Phase 5: 完善优化 - 生产就绪了吗？

### 任务清单

```bash
✓ 21. 预设风格：插入 styles 表数据
✓ 22. 静态文件服务：/data/images/*
✓ 23. 日志优化：关键路径日志补全
✓ 24. 性能测试：并发生成压力测试
✓ 25. 文档：API 使用说明和示例
```

### 验收条件

#### 21. 预设风格

**问题**：至少有几个风格？能查询到？应用到生成流程？

**验收标准**：

```graphql
# ✓ 能查询到预设风格
query {
  styles {
    id
    displayName
    description
    promptTemplate
  }
}

# 期望：至少返回 3-5 个预设风格
# 例如：
# - anime-style: 日系动漫风格
# - realistic: 写实照片风格
# - sketch: 素描手绘风格
```

```typescript
// test/phase5/styles.test.ts

// ✓ 数据库中有预设风格
const styles = await db.getActiveStyles()
assert(styles.length >= 3)
console.log(`✓ ${styles.length} preset styles available`)

// ✓ 每个风格都有必需字段
for (const style of styles) {
  assert(style.id)
  assert(style.displayName)
  assert(style.description)
  assert(style.promptTemplate)
}
console.log('✓ All styles have required fields')

// ✓ 应用风格到生成流程
const projectId = await genService.generate({
  inputType: 'text',
  inputContent: 'a cat',
  styleId: styles[0].id
})

await sleep(90000)

const images = await db.getImagesByProject(projectId)
// 验证 Prompt 包含风格模板
assert(images[0].prompt.includes(styles[0].promptTemplate))
console.log('✓ Style applied to generation')
```

**执行验证**：
```bash
bun test:phase5:styles
```

#### 22. 静态文件服务

**问题**：图片能访问？404 处理？安全性？

**验收标准**：

```bash
#!/bin/bash
# test/phase5/static-files.sh

# 准备测试图片
mkdir -p data/images/test-project
echo "fake png data" > data/images/test-project/test-image.png

# ✓ 图片能访问
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/data/images/test-project/test-image.png)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✓ Image accessible: 200 OK"
else
  echo "✗ Failed: $HTTP_STATUS"
  exit 1
fi

# ✓ Content-Type 正确
CONTENT_TYPE=$(curl -s -I http://localhost:3000/data/images/test-project/test-image.png \
  | grep -i "content-type" | cut -d' ' -f2)

if [[ "$CONTENT_TYPE" == *"image/png"* ]]; then
  echo "✓ Content-Type: image/png"
else
  echo "✗ Wrong Content-Type: $CONTENT_TYPE"
  exit 1
fi

# ✓ 404 处理
NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/data/images/fake/fake.png)

if [ "$NOT_FOUND" = "404" ]; then
  echo "✓ 404 for non-existent file"
else
  echo "✗ Should return 404, got: $NOT_FOUND"
  exit 1
fi

# ✓ 目录遍历攻击防护
ATTACK=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3000/data/images/../../.env)

if [ "$ATTACK" = "403" ] || [ "$ATTACK" = "404" ]; then
  echo "✓ Directory traversal blocked: $ATTACK"
else
  echo "✗ Security issue: $ATTACK"
  exit 1
fi

# 清理
rm -rf data/images/test-project

echo "✅ Static file serving tests passed"
```

**执行验证**：
```bash
chmod +x test/phase5/static-files.sh
bun test:phase5:static
```

#### 23. 日志优化

**问题**：关键路径都有日志？日志级别合理？错误有堆栈？

**验收标准**：

```bash
#!/bin/bash
# test/phase5/logging.sh

# 运行一次完整生成，捕获日志
bun run index.ts 2>&1 | tee test-logs.log &
SERVER_PID=$!
sleep 3

# 创建 Project 触发完整流程
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createProject(input: { inputType: TEXT, inputContent: \"test\" }) { project { id } } }"
  }' > /dev/null

sleep 90

# 验证日志
echo "📋 Checking logs..."

# ✓ 应该包含项目创建日志
grep -q "Creating project" test-logs.log && echo "✓ Project creation logged"

# ✓ 应该包含异步生成日志
grep -q "Starting async generation" test-logs.log && echo "✓ Async generation logged"

# ✓ 应该包含图片生成成功日志（9 次）
SUCCESS_COUNT=$(grep -c "Image generated successfully" test-logs.log)
if [ "$SUCCESS_COUNT" -ge 8 ]; then
  echo "✓ Image generation logged: $SUCCESS_COUNT times"
fi

# ✓ 应该包含生成完成日志
grep -q "Generation completed" test-logs.log && echo "✓ Completion logged"

# ✓ 日志应该有时间戳
grep -q "\[.*\]" test-logs.log && echo "✓ Timestamps present"

# ✓ 日志应该有级别
grep -q "info" test-logs.log && echo "✓ Log levels present"

# 停止服务器
kill $SERVER_PID

# 清理
rm test-logs.log

echo "✅ Logging tests passed"
```

**执行验证**：
```bash
chmod +x test/phase5/logging.sh
bun test:phase5:logging
```

#### 24. 并发压力测试

**问题**：10 个并发？成功率？响应时间？内存泄漏？

**验收标准**：

```javascript
// test/phase5/load-test.js (k6 script)
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,  // 10 个虚拟用户
  duration: '5m',  // 持续 5 分钟
  thresholds: {
    http_req_duration: ['p(95)<100000'],  // 95% 请求 < 100s
    http_req_failed: ['rate<0.05'],  // 失败率 < 5%
  }
}

export default function () {
  // 创建 Project
  const mutation = `
    mutation {
      createProject(input: {
        inputType: TEXT
        inputContent: "load test cat ${__VU}-${__ITER}"
      }) {
        project { id }
      }
    }
  `

  const response = http.post(
    'http://localhost:3000/graphql',
    JSON.stringify({ query: mutation }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  )

  // 验证响应
  check(response, {
    'status is 200': (r) => r.status === 200,
    'has project id': (r) => {
      const body = JSON.parse(r.body)
      return body.data?.createProject?.project?.id !== undefined
    }
  })

  sleep(1)
}
```

```bash
# 执行压力测试
k6 run test/phase5/load-test.js

# 期望输出：
# ✓ status is 200
# ✓ has project id
#
# checks.........................: 100.00% ✓ 600  ✗ 0
# http_req_duration..............: avg=2.5s  p(95)=5s
# http_req_failed................: 0.00%   ✓ 0    ✗ 600
# iterations.....................: 300
# vus............................: 10
```

**内存泄漏检测**：

```bash
#!/bin/bash
# test/phase5/memory-leak.sh

# 启动服务器并记录初始内存
bun run index.ts &
SERVER_PID=$!
sleep 5

INITIAL_MEM=$(ps -o rss= -p $SERVER_PID)
echo "Initial memory: $INITIAL_MEM KB"

# 创建 100 个 Projects
for i in {1..100}; do
  curl -s -X POST http://localhost:3000/graphql \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"mutation { createProject(input: { inputType: TEXT, inputContent: \\\"test $i\\\" }) { project { id } } }\"
    }" > /dev/null

  if [ $((i % 10)) -eq 0 ]; then
    echo "Created $i projects..."
  fi
done

# 等待所有生成完成
sleep 180

# 检查最终内存
FINAL_MEM=$(ps -o rss= -p $SERVER_PID)
echo "Final memory: $FINAL_MEM KB"

# 计算增长
MEM_INCREASE=$((FINAL_MEM - INITIAL_MEM))
MEM_INCREASE_PCT=$((MEM_INCREASE * 100 / INITIAL_MEM))

echo "Memory increase: $MEM_INCREASE KB ($MEM_INCREASE_PCT%)"

# ✓ 内存增长应该 < 50%
if [ $MEM_INCREASE_PCT -lt 50 ]; then
  echo "✓ No significant memory leak"
else
  echo "✗ Possible memory leak: $MEM_INCREASE_PCT% increase"
fi

kill $SERVER_PID
```

**执行验证**：
```bash
bun test:phase5:performance
```

#### 25. 文档完整性

**问题**：示例能执行？步骤完整？

**验收标准**：

```bash
#!/bin/bash
# test/phase5/docs-validation.sh

# 从 README.md 提取所有代码块
# 逐个执行验证

echo "📚 Validating documentation..."

# ✓ 安装步骤可执行
cd /tmp/test-peelpack
bun init -y
bun add hono graphql graphql-yoga
echo "✓ Installation steps work"

# ✓ 配置示例有效
cat > .env << EOF
PORT=3000
NANO_BANANA_API_KEY=test_key
NANO_BANANA_BASE_URL=https://api.test.com
DB_PATH=./data/peelpack.db
STORAGE_PATH=./data
EOF
echo "✓ Configuration example valid"

# ✓ GraphQL 示例语法正确
echo '
mutation {
  createProject(input: {
    inputType: TEXT
    inputContent: "test"
  }) {
    project { id }
  }
}
' | npx graphql-validate --schema schema.graphql

echo "✓ GraphQL examples valid"

# 清理
cd -
rm -rf /tmp/test-peelpack

echo "✅ Documentation validation passed"
```

**执行验证**：
```bash
bun test:phase5:docs
```

### Phase 5 整体验收

**单一入口脚本**：
```bash
bun test:phase5
```

**期望输出**：
```text
✓ 3+ preset styles available
✓ All styles have required fields
✓ Style applied to generation
✓ Static file serving: 200 OK
✓ Static file serving: correct MIME type
✓ Static file serving: 404 for missing files
✓ Static file serving: blocks directory traversal
✓ Logging: project creation
✓ Logging: async generation
✓ Logging: image generation (9x)
✓ Logging: completion
✓ Load test: 95%+ success rate
✓ Load test: p95 < 100s
✓ No significant memory leak after 100 projects
✓ Documentation examples executable

Tests: 15 passed, 15 total
Time: ~10m
```

---

## 测试策略总览

### 测试金字塔

```text
                    /\
                   /  \  E2E Tests (Phase 4-5)
                  /____\  ~10 tests, ~120s
                 /      \
                /  集成   \ Integration (Phase 3)
               /__________\  ~11 tests, ~5s
              /            \
             /   单元测试    \ Unit Tests (Phase 1-2)
            /________________\  ~23 tests, ~4s
```

### 测试分级

**P0（必须通过）- 阻塞发布**：
- ✅ 所有 Phase 1-2 单元测试
- ✅ Phase 3 基本集成测试（server 启动、GraphQL 可访问）
- ✅ Phase 4 核心 E2E（1 个 Project 成功生成 ≥8 张图）

**P1（应该通过）- 警告但不阻塞**：
- ⚠️ Phase 3 错误处理测试
- ⚠️ Phase 4 重试逻辑测试
- ⚠️ Phase 5 性能基准测试

**P2（最好通过）- 优化目标**：
- 💡 Phase 4 边界条件测试
- 💡 Phase 5 并发压力测试
- 💡 Phase 5 文档完整性测试

### CI/CD 集成策略

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:phase1
      - run: bun test:phase2
      - run: bun test:phase3

  e2e:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:phase4
        env:
          NANO_BANANA_API_KEY: ${{ secrets.NANO_BANANA_API_KEY }}

  performance:
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:phase5:performance
```

### 本地测试快速参考

```bash
# 完整测试套件（~15 分钟）
bun test

# 快速验证（Phase 1-3，~10 秒）
bun test:quick

# 单个 Phase
bun test:phase1  # ~1s
bun test:phase2  # ~3s
bun test:phase3  # ~5s
bun test:phase4  # ~120s，需要 API Key
bun test:phase5  # ~600s，性能测试

# 跳过慢速测试
bun test --skip-slow

# 只运行 P0 测试
bun test:critical
```

---

## 验收完成标准

### Phase 1: 基础设施
- ✅ 所有 11 个测试通过
- ✅ 执行时间 < 2s
- ✅ 无警告或错误日志

### Phase 2: 核心逻辑
- ✅ 所有 12 个测试通过
- ✅ Mock 模式下执行时间 < 5s
- ✅ 重试逻辑正确触发

### Phase 3: GraphQL 层
- ✅ 所有 11 个测试通过
- ✅ GraphQL Playground 可访问
- ✅ Subscription 连接稳定

### Phase 4: 真实集成
- ✅ 至少 13/14 个测试通过（允许偶发网络问题）
- ✅ E2E 成功率 ≥ 90%（9 张图至少 8 张成功）
- ✅ 生成时间 < 90s
- ✅ Subscription 推送 ≥ 9 次更新

### Phase 5: 完善优化
- ✅ 所有 15 个测试通过
- ✅ 压力测试成功率 ≥ 95%
- ✅ 内存增长 < 50%
- ✅ 文档示例可执行

---

## 附录：测试工具和辅助脚本

### package.json scripts

```json
{
  "scripts": {
    "test": "bun test",
    "test:phase1": "bun test base/",
    "test:phase2": "bun test core/",
    "test:phase3": "bun test port/ && ./test/phase3/server-test.sh",
    "test:phase4": "bun test:phase4:api && ./test/phase4/e2e-test.sh",
    "test:phase5": "bun test:phase5:all",
    "test:quick": "bun test:phase1 && bun test:phase2 && bun test:phase3",
    "test:critical": "bun test --grep 'P0'",
    "test:watch": "bun test --watch"
  }
}
```

### 辅助函数

```typescript
// test/helpers.ts

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 10000,
  interval: number = 100
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await sleep(interval)
  }
  throw new Error('Timeout waiting for condition')
}

export function createTestLogger(): Logger {
  return createLogger({ level: 'error' })  // 测试时只显示错误
}

export async function cleanupTestData(paths: string[]) {
  for (const path of paths) {
    await fs.rm(path, { recursive: true, force: true })
  }
}
```

---

**最后更新**: 2025-10-01
**文档版本**: 1.0.0
**维护者**: Violet
