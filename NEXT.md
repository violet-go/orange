# Phase 2 开发指令

## 📍 当前状态

✅ **Phase 1 已完成** (commit: 624fdea)
- base/config, logger, db, storage, pubsub 全部实现
- 18 个测试全部通过
- Git 仓库已初始化，.gitignore 配置正确

## 🎯 Phase 2 目标

实现核心业务逻辑，完成 **9 张情绪表情生成** 的完整流程（Mock API）。

**验收标准**：12 个测试通过，执行时间 < 5s

---

## 🚀 快速启动步骤

### Step 1: 阅读上下文 (2 分钟)

```bash
# 必读文件
cat .ctx/feature-design.md | grep -A 50 "core/prompt"   # Prompt 构造器设计
cat .ctx/acceptance-criteria.md | grep -A 100 "Phase 2" # 验收条件
```

**关键理解**：
- 9 种情绪：happy/sad/angry/surprised/thinking/shy/proud/tired/love
- Prompt 构造 = 基础 Prompt + 情绪模板
- Mock ImageGen：返回假图片，模拟延迟和失败

### Step 2: core/prompt - Prompt 构造器 (30 分钟)

**实现文件**：
1. `core/prompt/lib/emotions.json` - 9 种情绪模板
2. `core/prompt/type.ts` - 接口定义
3. `core/prompt/proc.ts` - PromptBuilder 实现
4. `test/phase2/prompt.test.ts` - 测试

**参考代码**：`.ctx/feature-design.md` 第 320-378 行

**验收点**（ACC 第 278-325 行）：
- ✓ 能构造单个情绪 Prompt
- ✓ 能构造所有 9 种情绪
- ✓ 顺序稳定（相同输入 → 相同顺序）

**自主验证**：
```bash
bun test test/phase2/prompt.test.ts
# 期望：3 个测试通过
```

### Step 3: core/image - Mock 图片生成 (30 分钟)

**实现文件**：
1. `core/image/type.ts` - ImageGen 接口
2. `core/image/proc.ts` - createMockImageGen() 实现
3. `test/phase2/image-gen.test.ts` - 测试

**参考代码**：`.ctx/feature-design.md` 第 381-462 行

**Mock 实现要点**：
```typescript
// 返回假图片 Buffer
const fakeImageBuffer = Buffer.from('PNG_FAKE_DATA_' + Date.now())

// 可配置延迟和失败率
createMockImageGen({
  delay: 100,      // 模拟 100ms 延迟
  failRate: 0.1    // 10% 失败率
})
```

**验收点**（ACC 第 327-378 行）：
- ✓ Mock 返回格式正确
- ✓ 能模拟延迟
- ✓ 能模拟失败
- ✓ 能模拟部分失败

**自主验证**：
```bash
bun test test/phase2/image-gen.test.ts
# 期望：4 个测试通过
```

### Step 4: core/gen - 生成服务 (60 分钟)

**实现文件**：
1. `core/gen/type.ts` - GenService 接口
2. `core/gen/proc.ts` - GenService 实现（orchestration）
3. `test/phase2/gen-service.test.ts` - 测试
4. `test/phase2/retry-logic.test.ts` - 重试逻辑测试

**参考代码**：`.ctx/feature-design.md` 第 465-718 行

**关键逻辑**：
```typescript
async generate(params) {
  // 1. 创建 Project + 9 个 Image (pending)
  // 2. 立即返回 projectId（不等待生成）
  // 3. 后台异步：Promise.allSettled 并发生成
  // 4. 失败自动重试一次（使用 seed+1）
  // 5. 每完成一张推送进度（通过 pubsub）
}
```

**验收点**（ACC 第 380-535 行）：
- ✓ 立即返回 projectId（< 100ms）
- ✓ 数据库有 Project 记录
- ✓ 数据库有 9 个 Image 记录
- ✓ 等待后所有图片生成完成
- ✓ 文件保存到 data/images/{projectId}/
- ✓ 失败后重试逻辑生效

**自主验证**：
```bash
bun test test/phase2/gen-service.test.ts
bun test test/phase2/retry-logic.test.ts
# 期望：共 5 个测试通过
```

### Step 5: Phase 2 整体验收 (15 分钟)

**创建统一测试入口**：
```typescript
// test/phase2.test.ts
import './phase2/prompt.test'
import './phase2/image-gen.test'
import './phase2/gen-service.test'
import './phase2/retry-logic.test'
```

**添加 npm script**：
```json
"test:phase2": "bun test test/phase2.test.ts"
```

**最终验证**：
```bash
bun test:phase2
# 期望：12 passed, 12 total, ~3s
```

**对照 ACC 检查清单**（第 520-535 行）：
- ✓ PromptBuilder generates 9 emotion prompts
- ✓ PromptBuilder combines base + emotion correctly
- ✓ PromptBuilder output order is stable
- ✓ Mock ImageGen returns valid image data
- ✓ Mock ImageGen simulates delay
- ✓ Mock ImageGen simulates failures
- ✓ GenService creates Project + 9 Images
- ✓ GenService returns projectId immediately
- ✓ Async generation completes all images
- ✓ Failed images retry once with different seed
- ✓ Retry logic uses different seed
- ✓ Project status updates correctly

---

## 🔑 关键原则

1. **文档驱动开发** - 每写一个模块前，先读 feature-design.md 的对应代码示例
2. **测试驱动开发** - 先写测试（基于 ACC），再写实现
3. **积极使用并行** - Read 多个文件，Write 一个文件
4. **自主验证每一步** - 写完立即测试，不等所有代码完成

## 🎯 成功标准

今天结束时应该达到：
- ✅ 所有 core/ 模块实现完成
- ✅ 12 个单元测试全部通过
- ✅ 执行时间 < 5s
- ✅ Mock 模式下能完整模拟生成流程

## 💡 快速命令

```bash
# 启动开发
cd /home/violet/proj/orange

# 查看 Phase 2 验收条件
cat .ctx/acceptance-criteria.md | sed -n '/Phase 2/,/Phase 3/p'

# 运行测试
bun test:phase2

# 查看 Git 状态
git log --oneline -5
```

---

**预计时间**：2-3 小时
**当前时间**：2025-10-01 18:10

祝开发顺利！🚀
