# 前端开发执行指南

## 快速启动（5 分钟）

```bash
# 1. 阅读核心文档（必读）
cat .ctx/ui-design.md | head -200        # 前 200 行了解架构
cat .ctx/ui-acc.md | head -150           # 前 150 行了解验收标准

# 2. 确认后端已运行
curl http://localhost:3000/graphql      # 应返回 GraphQL Playground

# 3. 初始化前端项目（如果尚未创建）
cd app/
bun create vite@latest . --template react-ts
bun install
bun add @tanstack/react-router @tanstack/react-query graphql-request graphql-ws
bun add -D tailwindcss postcss autoprefixer
bunx tailwindcss init -p

# 4. 启动开发服务器
bun run dev                              # http://localhost:5173

# 5. 确认目标
echo "Phase 1 目标：核心流程端到端打通"
```

---

## 开发哲学：测试驱动 + 结果导向

### 核心原则

```
1. 先写验收测试 → 再写实现 → 最后重构
2. 每个功能都是一个可验收的结果
3. 优先端到端流程，而非完美组件
4. 能跑 > 完美 > 优化
```

### 工作流程

```
┌─────────────────────────────────────────┐
│ 1. 选择一个验收用例（ui-acc.md）      │
│    例：测试用例 1.1 - 基础输入         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. 写手动测试步骤（文本文件）          │
│    tests/manual/phase1-basic-input.md   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. 实现最小可用版本（丑但能跑）        │
│    app/routes/index.tsx                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. 手动测试验证（对照步骤）            │
│    打开浏览器，逐步操作                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 5. 通过 ✓ → 下一个用例                │
│    不通过 ✗ → 修复 Bug → 重测          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 6. 所有用例通过 → Phase 验收           │
└─────────────────────────────────────────┘
```

---

## Phase 1: MVP 开发（预计 4 小时）

### 目标验收标准

参考 `.ctx/ui-acc.md` Phase 1 章节：
- 测试用例 1.1-1.3：首页输入
- 测试用例 2.1-2.3：进度展示
- 测试用例 3.1-3.3：九宫格布局
- 测试用例 4.1-4.2：单张下载

### 开发顺序（自下而上）

#### Step 1: GraphQL Client（30 分钟）

```bash
# 创建文件
touch app/lib/graphql/client.ts
touch app/lib/graphql/queries.ts
touch app/lib/graphql/mutations.ts
```

**验收标准**：
```bash
# 测试 Query
curl -X POST http://localhost:5173/api/test-query
# 应返回 styles 列表

# 测试 Mutation
curl -X POST http://localhost:5173/api/test-mutation
# 应返回 project id
```

**实现检查清单**：
- [ ] GraphQL Client 配置正确（/graphql endpoint）
- [ ] Query 能获取 styles 列表
- [ ] Mutation 能创建 project
- [ ] 错误处理（网络错误、GraphQL 错误）

#### Step 2: 配置 Hero UI（5 分钟）

```bash
# 安装 Hero UI
bun add @heroui/react framer-motion

# 配置 Tailwind（参考 QUICKSTART-HERO-UI.md）
# 添加 Provider 到 app/root.tsx
```

**验收标准**：
```bash
# 创建测试页面
echo 'import { Button } from "@heroui/react"
export default () => <Button color="primary">测试</Button>' > app/routes/test.tsx

# 访问 http://localhost:5173/test
# 应该看到紫色按钮
```

**实现检查清单**：
- [ ] @heroui/react 已安装
- [ ] tailwind.config.ts 配置正确
- [ ] HeroUIProvider 已添加
- [ ] 测试按钮显示正常

**时间控制**：
- 严格 5 分钟，直接复制 QUICKSTART-HERO-UI.md 配置
- 不要自己调整，先用默认配置

#### Step 3: 首页生成器（30 分钟）

**目标**：用户能输入描述并触发生成

```bash
# 创建页面
touch app/routes/index.tsx
```

**开发步骤**（使用 Hero UI 加速）：

1. **使用 Hero UI 组件**（5 分钟）
```tsx
import { Button, Textarea, Card } from '@heroui/react'
import { useState } from 'react'

export default function Home() {
  const [description, setDescription] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-8 text-center">
            PeelPack 小贴纸机
          </h1>

          <Textarea
            label="描述你想要的贴纸"
            placeholder="例如：一只可爱的橘猫"
            value={description}
            onValueChange={setDescription}
            variant="bordered"
            autoFocus
          />

          <Button
            color="primary"
            size="lg"
            className="w-full mt-6"
            isDisabled={!description.trim()}
          >
            生成贴纸包 🎨
          </Button>
        </Card>
      </div>
    </div>
  )
}
```

2. **集成 GraphQL Mutation**（15 分钟）
```tsx
const createProject = useMutation({
  mutationFn: (input) => graphqlClient.request(CREATE_PROJECT, { input }),
  onSuccess: (data) => navigate(`/projects/${data.id}`)
})

<Button
  onPress={() => createProject.mutate({ inputContent: description })}
  isLoading={createProject.isPending}
>
  {createProject.isPending ? '生成中...' : '生成贴纸包 🎨'}
</Button>
```

3. **手动测试**（10 分钟）
- 打开 http://localhost:5173
- 按照 `.ctx/ui-acc.md` 测试用例 1.1 操作
- 记录结果：✓ 通过 / ✗ 失败（原因）

**验收检查清单**：
```
□ 输入框自动聚焦
□ 空值时按钮禁用
□ 输入内容后按钮可点击
□ 点击后按钮变为"生成中..."
□ 成功后跳转到 /projects/:id
□ 网络错误显示提示（可选 Phase 1）
```

**时间控制**：
- 不做风格选择器（固定无风格）
- 不做错误处理（Phase 2）
- Hero UI 的 isLoading 自动处理加载动画

**Hero UI 优势**：
- ✅ 自动聚焦（autoFocus prop）
- ✅ 自动禁用（isDisabled prop）
- ✅ 自动加载（isLoading prop）
- ✅ 无需手写样式（variant="bordered"）

#### Step 4: 进度页面（60 分钟）

**目标**：显示生成进度和结果

```bash
touch app/routes/projects/$id.tsx
touch app/components/ProgressMonitor.tsx
touch app/components/ImageGrid.tsx
```

**开发步骤**（使用 Hero UI 加速）：

1. **Query 项目状态**（10 分钟）
```tsx
const { data: project } = useQuery({
  queryKey: ['project', id],
  queryFn: () => getProject(id),
  refetchInterval: (data) =>
    data?.status === 'generating' ? 5000 : false
})
```

2. **进度监控器（Hero UI）**（20 分钟）
```tsx
import { Progress, Card, Skeleton } from '@heroui/react'

function ProgressMonitor({ current, total }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Progress
          label="正在生成贴纸包"
          value={(current / total) * 100}
          color="primary"
          showValueLabel
        />
        <p className="text-sm text-default-500 mt-3 text-center">
          已完成 {current} / {total} 张
        </p>
      </Card>

      {/* 骨架屏 - Hero UI 自带 */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="rounded-lg aspect-square" />
        ))}
      </div>
    </div>
  )
}
```

3. **九宫格展示（Hero UI）**（15 分钟）
```tsx
import { Card } from '@heroui/react'

function ImageGrid({ images }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((img) => (
        <Card key={img.id} isPressable isHoverable>
          <img src={img.fileUrl} alt={img.emotionType} />
        </Card>
      ))}
    </div>
  )
}
```

4. **手动测试**（15 分钟）
- 从首页生成项目
- 观察进度更新（5 秒间隔）
- 等待完成，查看九宫格
- 对照验收标准逐项检查

**验收检查清单**：
```
□ 显示进度条（X/9）
□ 显示预计时间（约 XX 秒）
□ 每 5 秒自动刷新
□ 已完成图片立即显示
□ 未完成显示占位符
□ 完成后停止轮询
□ 刷新页面能恢复状态
```

**时间控制**：
- 轮询即可，不做 Subscription
- Hero UI 的 Skeleton 自动处理骨架屏
- Hero UI 的 Progress 自动处理进度条
- 不做剩余时间估算（Phase 2）

**Hero UI 优势**：
- ✅ Progress 组件开箱即用
- ✅ Skeleton 自动处理加载状态
- ✅ Card 自动处理 hover 效果
- ✅ 节省 30 分钟手写时间

#### Step 5: 单张下载（30 分钟）

**目标**：用户能下载图片

```tsx
// 最简单的实现
<img
  src={image.fileUrl}
  alt={image.emotionType}
  onClick={() => window.open(image.fileUrl)}
/>
```

或者：
```tsx
<a href={image.fileUrl} download={`emotion-${image.emotionType}.png`}>
  <img src={image.fileUrl} />
</a>
```

**验收检查清单**：
```
□ 点击图片能查看大图
□ 右键另存为能下载
□ 文件名有意义（不是 UUID）
```

---

### Phase 1 验收会议

**自我验收清单**（30 分钟）：

```bash
# 1. 端到端流程测试
echo "开始完整流程测试..." > test-log.txt

# 访问首页
open http://localhost:5173
# 记录：□ 输入框自动聚焦

# 输入描述
# 记录：□ 按钮从禁用变为可点击

# 点击生成
# 记录：□ 跳转到进度页

# 观察进度
# 记录：□ 进度条显示
# 记录：□ 每 5 秒更新

# 等待完成
# 记录：□ 九宫格显示 9 张图片

# 下载图片
# 记录：□ 能成功下载

# 2. 性能检查
# DevTools Network 标签
# 记录：首页加载时间 < 2s
# 记录：轮询间隔约 5s

# 3. 异常测试
# 断开网络，点击生成
# 记录：□ 有错误提示或 Console 报错

# 4. 决策
grep "✗" test-log.txt && echo "未通过验收" || echo "通过验收"
```

**通过标准**：
- 核心流程完整（输入 → 生成 → 查看 → 下载）
- 无阻塞性 Bug（P0）
- 性能在可接受范围（< 5s 首页加载）

**不通过标准**：
- 核心流程中断（无法生成/无法查看）
- 数据丢失（刷新后进度丢失）
- 服务崩溃

---

## Phase 2: 完整体验开发（预计 8 小时）

### 开发顺序（优先级排序）

#### Priority 1: Subscription 实时推送（2 小时）

**为什么优先**：体验提升最大，技术难度最高

```bash
# 安装依赖
bun add graphql-ws

# 创建 WebSocket Client
touch app/lib/graphql/ws-client.ts
touch app/hooks/useProjectProgress.ts
```

**开发步骤**：

1. **配置 WebSocket Client**（30 分钟）
```tsx
import { createClient } from 'graphql-ws'

export const wsClient = createClient({
  url: 'ws://localhost:3000/graphql'
})
```

2. **Subscription Hook**（30 分钟）
```tsx
export function useProjectProgress(projectId: string) {
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    const unsubscribe = wsClient.subscribe({
      query: PROJECT_PROGRESS_SUBSCRIPTION,
      variables: { projectId }
    }, {
      next: (data) => setProgress(data.projectProgress),
      error: (err) => console.error(err)
    })

    return unsubscribe
  }, [projectId])

  return progress
}
```

3. **替换轮询逻辑**（30 分钟）
```tsx
// 删除 refetchInterval
// 使用 useProjectProgress hook
const progress = useProjectProgress(id)
```

4. **测试验证**（30 分钟）
- DevTools → Network → WS 标签
- 验证 WebSocket 连接
- 验证推送延迟 < 1s
- 测试断线重连

**验收检查清单**：
```
□ WebSocket 连接成功
□ 每完成一张图片推送更新
□ 推送延迟 < 1s
□ 断线后自动重连（或降级轮询）
```

#### Priority 2: 风格选择器（1.5 小时）

```bash
touch app/components/StylePicker.tsx
touch app/components/StyleCard.tsx
```

**开发步骤**：

1. **Query 风格列表**（20 分钟）
2. **网格布局**（20 分钟）
3. **选择交互**（30 分钟）
4. **传递到 Mutation**（20 分钟）

**验收检查清单**：参考 ui-acc.md 测试用例 5.1-5.3

#### Priority 3: 16 张贴纸（1 小时）

**修改**：
- 后端已支持 16 张（9 情绪 + 7 意外）
- 前端只需调整布局

```tsx
// 分两个区域
<div>
  <h2>九宫格情绪</h2>
  <div className="grid grid-cols-3 gap-4">
    {emotions.map(...)}
  </div>

  <h2>意外表情</h2>
  <div className="grid grid-cols-7 gap-3">
    {surprises.map(...)}
  </div>
</div>
```

#### Priority 4: Canvas 相框（2 小时）

```bash
touch app/components/FrameEditor.tsx
bun add canvas  # 可选，浏览器原生 Canvas 即可
```

**开发步骤**：
1. **基础渲染**（40 分钟）
2. **4 种相框样式**（40 分钟）
3. **切换交互**（20 分钟）
4. **导出功能**（20 分钟）

#### Priority 5: ZIP 下载（1.5 小时）

```bash
bun add jszip file-saver
touch app/utils/zipDownload.ts
```

**开发步骤**：
1. **并发下载图片**（30 分钟）
2. **打包 ZIP**（30 分钟）
3. **进度显示**（20 分钟）
4. **错误处理**（10 分钟）

#### Priority 6: Lightbox + 重试（2 小时）

**Lightbox**（60 分钟）：
```bash
touch app/components/ImageLightbox.tsx
```

**重试机制**（60 分钟）：
```tsx
const retryImage = useMutation({
  mutationFn: (id) => graphqlClient.request(RETRY_IMAGE, { id })
})
```

---

### Phase 2 验收清单

```bash
# 端到端测试（完整版）
□ 选择风格 → 生成
□ 实时看到进度（< 1s 延迟）
□ 16 张图片分类展示
□ 切换相框实时更新
□ 下载 ZIP（16 张）
□ 点击图片打开 Lightbox
□ 失败图片能重试

# 性能检查
□ WebSocket 连接 < 500ms
□ Canvas 渲染 < 2s
□ ZIP 打包 < 10s

# 决策
全部通过 → Phase 3
有 P1 Bug → 修复后重测
```

---

## Phase 3: 精致体验开发（预计 4 小时）

### 开发顺序

1. **历史列表**（1 小时）
2. **Remix 功能**（1 小时）
3. **响应式布局**（1 小时）
4. **认证系统**（1 小时）

### 简化策略

如果时间紧张，Phase 3 可以按优先级选择实现：

**Must Have**：
- 响应式布局（移动端可用）

**Nice to Have**：
- 历史列表
- Remix 功能

**Can Wait**：
- 认证系统（MVP 可跳过）
- 相框编辑器
- 分享功能

---

## 测试驱动开发实践

### 手动测试优先

**为什么不先写自动化测试**：
1. UI 变化快，E2E 测试维护成本高
2. 手动测试更灵活，能发现意外问题
3. MVP 阶段优先速度

**手动测试流程**：

```bash
# 1. 创建测试日志
mkdir -p tests/manual
touch tests/manual/phase1-checklist.md

# 2. 每个测试用例一个 Markdown 文件
echo "# 测试用例 1.1 - 基础输入

## 操作步骤
1. 访问 http://localhost:5173
2. 输入框是否自动聚焦？[ ]
3. 输入'一只可爱的橘猫'
4. 按钮是否变为可点击？[ ]
5. 点击生成
6. 是否跳转到进度页？[ ]

## 结果
- [ ] 通过
- [ ] 失败（原因：___）

## 截图
![](./screenshots/test-1-1.png)
" > tests/manual/test-1-1-basic-input.md

# 3. 执行测试并记录
open http://localhost:5173
# 按步骤操作，勾选结果

# 4. 汇总结果
grep -r "\- \[x\] 通过" tests/manual/ | wc -l
```

### 自动化测试时机

**Phase 1-2**：手动测试为主
**Phase 3**：关键流程自动化

```bash
# 安装 Playwright
bun add -D @playwright/test

# 写核心流程测试
touch tests/e2e/core-flow.spec.ts
```

```typescript
// tests/e2e/core-flow.spec.ts
import { test, expect } from '@playwright/test'

test('核心流程：生成贴纸包', async ({ page }) => {
  // 访问首页
  await page.goto('http://localhost:5173')

  // 输入描述
  await page.fill('textarea', '一只可爱的橘猫')

  // 点击生成
  await page.click('button:has-text("生成")')

  // 等待跳转
  await page.waitForURL(/\/projects\//)

  // 等待完成（最多 120 秒）
  await page.waitForSelector('.result-view', { timeout: 120000 })

  // 验证 9 张图片
  const images = await page.locator('img[alt*="emotion"]').count()
  expect(images).toBe(9)
})
```

---

## 常见问题处理

### Q1: GraphQL 请求 CORS 错误

**现象**：
```
Access to fetch at 'http://localhost:3000/graphql' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**解决**：
```typescript
// 后端 index.ts
import { cors } from 'hono/cors'

app.use('/*', cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
```

### Q2: WebSocket 连接失败

**现象**：
```
WebSocket connection to 'ws://localhost:3000/graphql' failed
```

**排查**：
```bash
# 1. 确认后端支持 WebSocket
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3000/graphql

# 2. 检查后端 WebSocket 配置
# index.ts 应该有：
export default {
  port: 3000,
  fetch: app.fetch,
  websocket: yoga.websocket  // ← 关键
}
```

### Q3: 图片加载失败（404）

**现象**：
```
GET http://localhost:3000/data/images/proj-xxx/img-yyy.png 404
```

**排查**：
```bash
# 1. 确认文件存在
ls data/images/proj-xxx/

# 2. 确认静态文件服务配置
# 后端应该有：
app.get('/data/*', async (c) => {
  const path = c.req.path.replace('/data/', '')
  const exists = await storage.exists(path)
  if (!exists) return c.text('Not found', 404)
  const buffer = await storage.read(path)
  return new Response(buffer, {
    headers: { 'Content-Type': 'image/png' }
  })
})
```

### Q4: 进度不更新

**现象**：
- 生成中，但页面进度停在 0/9

**排查**：
```bash
# 1. 检查后端日志
# 是否有图片生成完成的日志？

# 2. 检查数据库
sqlite3 data/peelpack.db "SELECT id, status FROM images WHERE project_id='xxx'"
# 是否有 status='success' 的记录？

# 3. 检查轮询
# DevTools Network 标签
# 是否每 5 秒发送 Query 请求？

# 4. 检查 Subscription（Phase 2）
# DevTools Network → WS 标签
# 是否收到 projectProgress 推送？
```

### Q5: 性能慢（加载超过 10 秒）

**排查**：

```bash
# 1. Lighthouse 分析
# Chrome DevTools → Lighthouse → 运行

# 2. Bundle 大小分析
bun run build
bun run preview
# 检查 dist/ 目录大小

# 3. 优化策略
# - 代码分割（lazy import）
# - 图片懒加载
# - 压缩图片
# - 使用 CDN
```

---

## 时间管理技巧

### 番茄工作法

```
Phase 1 (4 小时) = 8 个番茄
- GraphQL Client: 1 番茄
- 原子组件: 1 番茄
- 首页: 2 番茄
- 进度页: 3 番茄
- 下载: 1 番茄

每个番茄 = 25 分钟专注 + 5 分钟休息
```

### 时间盒（Timeboxing）

**原则**：为每个任务设定时间上限

```bash
# 例：首页布局
# 时间盒：30 分钟

# 启动计时器
timer 30m

# 30 分钟后评估
if [ "功能完成" ]; then
  echo "进入下一任务"
else
  echo "简化需求或跳过"
fi
```

**关键决策点**：
- 超时 20% → 简化需求（去掉非核心功能）
- 超时 50% → 跳过该功能（标记为 Phase 2）
- 超时 100% → 寻求帮助或换思路

### 进度追踪

```bash
# 创建进度看板
touch PROGRESS.md

echo "# 开发进度

## Phase 1
- [x] GraphQL Client (30min)
- [x] 原子组件 (30min)
- [x] 首页生成器 (60min)
- [ ] 进度页面 (90min) ← 当前
- [ ] 单张下载 (30min)

## 统计
- 已完成：3/5 (60%)
- 已用时间：2h
- 预计剩余：2h
" > PROGRESS.md
```

---

## 决策框架

### 功能取舍决策树

```
遇到复杂功能时：

1. 这是核心流程必需的吗？
   ├─ 是 → 简化实现（最小可用版本）
   └─ 否 → 2

2. 不实现会阻塞后续开发吗？
   ├─ 是 → 简化实现
   └─ 否 → 3

3. 实现成本（时间）是否 < 1 番茄？
   ├─ 是 → 实现
   └─ 否 → 标记为下一 Phase，跳过
```

### 技术选型决策

```
遇到技术选择时：

1. 有现成的解决方案吗？
   ├─ 是 → 优先使用（别重复造轮）
   └─ 否 → 2

2. 原生 API 能实现吗？
   ├─ 是 → 使用原生（避免依赖）
   └─ 否 → 3

3. 社区方案成熟吗（GitHub stars > 5k）？
   ├─ 是 → 使用社区方案
   └─ 否 → 考虑自己实现或跳过功能
```

### Bug 修复优先级

```
发现 Bug 时：

1. 阻塞核心流程吗？
   ├─ 是 → P0，立即修复
   └─ 否 → 2

2. 影响验收标准吗？
   ├─ 是 → P1，当前 Phase 修复
   └─ 否 → 3

3. 视觉/体验问题？
   ├─ 是 → P2，下一 Phase 修复
   └─ 否 → P3，记录到 Backlog
```

---

## 每日启动检查清单

```bash
# 每天开始开发前（5 分钟）

echo "=== 开发环境检查 ==="

# 1. 后端运行
curl -s http://localhost:3000/graphql > /dev/null && \
  echo "✓ 后端运行中" || \
  echo "✗ 后端未启动，执行：cd .. && bun run index.ts"

# 2. 前端运行
curl -s http://localhost:5173 > /dev/null && \
  echo "✓ 前端运行中" || \
  echo "✗ 前端未启动，执行：bun run dev"

# 3. 数据库可访问
[ -f ../data/peelpack.db ] && \
  echo "✓ 数据库存在" || \
  echo "✗ 数据库不存在"

# 4. Git 状态干净
git status --short | wc -l | grep -q "^0$" && \
  echo "✓ Git 状态干净" || \
  echo "⚠ 有未提交的修改（记得定期 commit）"

echo ""
echo "=== 今日目标 ==="
cat PROGRESS.md | grep "← 当前"

echo ""
echo "=== 开始开发 🚀 ==="
```

---

## 最后的建议

### 心态管理

1. **完美主义是敌人**：能跑 > 完美
2. **迭代优于一次性**：Phase 1 丑但能用，Phase 2 抛光
3. **时间盒是朋友**：超时就简化，不要陷入细节

### 效率技巧

1. **并行开发**：前端页面 + 后端 API 同时开发（Mock 数据）
2. **热重载**：Vite HMR 秒级更新，无需刷新
3. **DevTools 常驻**：Network/Console/WS 标签随时监控

### 求助策略

**遇到卡点（超过 1 小时无进展）**：

1. 简化问题（能否用更简单的方式实现？）
2. 搜索解决方案（Stack Overflow / GitHub Issues）
3. 跳过该功能（标记为 TODO，继续后续开发）
4. 寻求帮助（提供完整的错误信息和复现步骤）

---

## 快速参考

### 关键命令

```bash
# 启动开发
bun run dev

# 构建生产
bun run build

# 预览生产
bun run preview

# 运行测试
bun test

# E2E 测试
bun test:e2e

# 检查类型
bunx tsc --noEmit

# 格式化代码
bunx prettier --write "**/*.{ts,tsx}"
```

### 关键文件位置

```
.ctx/ui-design.md        # UI 设计文档（架构、组件、流程）
.ctx/ui-acc.md           # 验收标准（测试用例）
app/routes/              # 页面路由
app/components/          # UI 组件
app/lib/graphql/         # GraphQL Client
tests/manual/            # 手动测试日志
PROGRESS.md              # 进度追踪
```

### 核心 URL

```
前端：http://localhost:5173
后端：http://localhost:3000
GraphQL Playground：http://localhost:3000/graphql
```

---

**记住**：这份指南不是圣经，是工具。根据实际情况灵活调整。目标是在有限时间内交付可用的产品，而非完美的艺术品。

**开始前问自己**：
1. 今天要完成哪个 Phase？
2. 最小可用版本是什么样？
3. 超时后的 Plan B 是什么？

**开始后提醒自己**：
1. 时间盒到了吗？
2. 偏离核心流程了吗？
3. 这个细节真的重要吗？

**完成后奖励自己**：
1. 提交代码（小步提交，频繁推送）
2. 更新进度看板
3. 休息 10 分钟 🎉

---

现在，打开 `.ctx/ui-acc.md`，选择第一个测试用例，开始编码吧！
