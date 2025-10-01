# Phase 4 开发指令

## 📍 当前状态

✅ **Phase 1-2 已完成** (commit: 624fdea, e8a6f12)
- base/core 模块全部实现并测试通过
- Mock 模式完整生成流程验证

✅ **Phase 3 已完成** (当前会话)
- GraphQL API 层实现完毕（schema + resolvers + server）
- Hono + GraphQL Yoga 集成成功
- 手动测试验证：Query/Mutation 正常工作
- 静态文件服务正常

## 🎯 Phase 4 目标

实现 **真实 API 集成**，从 Mock 切换到 Google Nano Banana 真实图片生成。

**验收标准**：端到端生成 9 张真实图片，Subscription 实时推送进度，错误处理和重试机制验证

---

## 🚀 快速启动步骤

### Step 1: 实现真实 ImageGen (30 分钟)

**当前状态**：`core/image/proc.ts` 只有 Mock 实现

**任务**：添加真实 Google Nano Banana API 调用

**实现文件**：
```typescript
// core/image/proc.ts - 添加 createRealImageGen()

export function createRealImageGen(config: {
  apiKey: string
  baseUrl: string
  logger: Logger
}): ImageGen {
  return {
    async generate(params) {
      // 1. 调用 Google Nano Banana API
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

      // 2. 错误处理
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // 3. 下载图片
      const data = await response.json()
      const imageResponse = await fetch(data.imageUrl)
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

      return {
        imageBuffer,
        width: data.width,
        height: data.height,
        metadata: { modelVersion: data.version }
      }
    }
  }
}
```

**更新 index.ts**：
```typescript
// 替换 Mock 为 Real
const imageGen = createRealImageGen({
  apiKey: config.nanoBananaApiKey,
  baseUrl: config.nanoBananaBaseUrl,
  logger
})
```

**验证**：
```bash
# 启动服务器
bun run index.ts

# 创建测试 Project
curl -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { createProject(input: { inputType: TEXT, inputContent: \"a simple red apple\" }) { project { id } } }"}'

# 等待 1-2 分钟，查询结果
curl -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ project(id: \"刚才的ID\") { status images { status errorMessage } } }"}'
```

### Step 2: E2E 测试脚本 (20 分钟)

**创建测试脚本**：`test/phase4/e2e-test.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Phase 4 E2E Test"

# 1. 启动服务器
bun run index.ts &
SERVER_PID=$!
sleep 3

# 2. 创建 Project
PROJECT_ID=$(curl -s -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { createProject(input: { inputType: TEXT, inputContent: \"cute cat girl anime\" }) { project { id } } }"}' \
  | jq -r '.data.createProject.project.id')

echo "✓ Project created: $PROJECT_ID"

# 3. 轮询等待完成（最多 2 分钟）
for i in {1..24}; do
  sleep 5
  STATUS=$(curl -s -X POST http://localhost:3000/graphql \
    -H 'Content-Type: application/json' \
    -d "{\"query\":\"{ project(id: \\\"$PROJECT_ID\\\") { status } }\"}" \
    | jq -r '.data.project.status')

  echo "  [$i] Status: $STATUS"

  if [[ "$STATUS" == "COMPLETED" || "$STATUS" == "PARTIAL_FAILED" ]]; then
    break
  fi
done

# 4. 验证结果
RESULT=$(curl -s -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d "{\"query\":\"{ project(id: \\\"$PROJECT_ID\\\") { status images { id status } } }\"}")

SUCCESS_COUNT=$(echo "$RESULT" | jq '[.data.project.images[] | select(.status == "SUCCESS")] | length')
FINAL_STATUS=$(echo "$RESULT" | jq -r '.data.project.status')

echo ""
echo "========================================="
echo "Final Status: $FINAL_STATUS"
echo "Success: $SUCCESS_COUNT/9 images"

# 5. 清理
kill $SERVER_PID 2>/dev/null || true

if [ "$SUCCESS_COUNT" -ge 8 ]; then
  echo "✅ E2E Test PASSED"
  exit 0
else
  echo "❌ E2E Test FAILED"
  exit 1
fi
```

**执行**：
```bash
chmod +x test/phase4/e2e-test.sh
./test/phase4/e2e-test.sh
```

### Step 3: Subscription 测试 (可选，15 分钟)

**使用 WebSocket 客户端测试**：

```bash
# 安装 wscat
bun add -d wscat

# 连接 WebSocket
wscat -c ws://localhost:3000/graphql -s graphql-ws

# 发送 Subscription
{"type":"connection_init"}
{"id":"1","type":"subscribe","payload":{"query":"subscription { projectProgress(projectId: \"xxx\") { status completedCount totalCount } }"}}
```

或使用 GraphQL Playground 的 Subscription 标签页手动测试。

### Step 4: 错误处理测试 (可选，15 分钟)

**测试场景**：
1. 无效 API Key → 验证错误日志和 Image status=failed
2. 网络超时 → 验证重试逻辑
3. 部分图片失败 → 验证 Project status=partial_failed

**修改 .env 测试**：
```bash
# 临时使用无效 API Key
NANO_BANANA_API_KEY=invalid_key_test

# 启动并创建 Project
bun run index.ts

# 观察日志中的错误处理
```

---

## 🔑 关键原则

1. **API Key 安全** - 确保 .env 中有真实有效的 API Key
2. **超时处理** - 图片生成可能需要 5-10 秒/张，设置合理超时
3. **重试策略** - 失败后自动重试 1 次（已在 GenService 实现）
4. **日志完整** - 记录每次 API 调用的成功/失败
5. **渐进验证** - 先测试单张图片，再测试完整 9 张

## 🎯 成功标准

Phase 4 结束时应该达到：
- ✅ 真实 API 能成功生成图片
- ✅ E2E 测试：9 张图片成功率 ≥ 90% (≥8 张)
- ✅ 生成时间：单个 Project < 2 分钟
- ✅ Subscription 能接收到至少 9 次进度更新
- ✅ 错误处理：失败的图片有明确错误信息
- ✅ 重试逻辑：失败后自动重试使用不同 seed

## 💡 快速命令

```bash
# 查看当前状态
cd /home/violet/proj/orange
git status

# 查看 Phase 4 验收条件
cat .ctx/acceptance-criteria.md | sed -n '/Phase 4/,/Phase 5/p'

# 启动开发服务器
bun run index.ts

# 快速测试单个请求
curl -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation { createProject(input: { inputType: TEXT, inputContent: \"test\" }) { project { id status } } }"}'

# 查看生成的图片
ls -lh data/images/*/
```

---

## 📚 参考资料

- **Google Nano Banana API 文档**：https://api.nanoBanana.com/docs
- **GraphQL Subscriptions**：https://the-guild.dev/graphql/yoga-server/docs/features/subscriptions
- **Bun fetch API**：https://bun.sh/docs/api/fetch

---

**预计时间**：1-2 小时（取决于真实 API 响应速度）
**当前时间**：2025-10-01 18:38

Phase 3 ✅ 完成，开始 Phase 4！🚀
