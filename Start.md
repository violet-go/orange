工作指令

  🎯 核心目标

  开始 Phase 1: 基础设施开发目标：搭建项目骨架，完成所有 base/ 模块，通过 11 个单元测试。

  ---
  📋 明日执行指令（给明天的 Claude）

  # Phase 1 开发指令

  ## 背景
  今天完成了 3 个设计文档：
  - .ctx/system-design.md - 系统整体设计
  - .ctx/feature-design.md - MVP 功能设计和核心模块代码
  - .ctx/acceptance-criteria.md - 详细验收条件

  现在开始 Phase 1 开发。

  ## 工作流程

  ### Step 0: 理解上下文（5分钟）
  1. Read .ctx/feature-design.md - 理解 MVP 目标和技术栈
  2. Read .ctx/acceptance-criteria.md 的 Phase 1 部分
  3. 明确今天的目标：完成 base/ 所有模块，通过 11 个测试

  ### Step 1: 项目初始化（10分钟）
  ```bash
  # 1. 初始化项目
  bun init -y

  # 2. 安装依赖
  bun add hono graphql graphql-yoga

  # 3. 创建目录结构
  mkdir -p {base,core,port}/{config,db,storage,logger,pubsub}
  mkdir -p data/{images,log}
  mkdir -p test/{phase1,phase2,phase3,phase4,phase5}

  ACC 验证点：
  - ✓ package.json 存在
  - ✓ node_modules 存在
  - ✓ 目录结构符合 L3 架构

  Step 2: base/config - 配置加载（30分钟）

  参考：
  - feature-design.md 第 665-696 行（配置管理示例）
  - acceptance-criteria.md 第 45-73 行（Config ACC）

  开发步骤：
  1. 创建 base/config/type.ts（定义 Config interface）
  2. 创建 base/config/proc.ts（实现 loadConfig）
  3. 创建 .env.example
  4. 创建 test/phase1/config.test.ts

  🤖 使用子代理：
  // 可以让子代理帮你生成测试文件
  Task: "Generate test file for base/config based on ACC"
  Prompt: "根据 .ctx/acceptance-criteria.md 第 45-73 行的验收条件，
  生成 test/phase1/config.test.ts 的完整测试代码"

  ✅ 自主验证：
  bun test base/config/proc.test.ts
  # 期望：3 个测试通过
  # ✓ 能读取 .env 配置
  # ✓ 缺少必需配置应该抛出错误
  # ✓ 配置类型正确

  Step 3: base/logger - 5-level 日志（45分钟）

  参考：
  - ~/proj/claude-hack/base/logger/ （参考实现）
  - acceptance-criteria.md 第 75-108 行（Logger ACC）

  开发步骤：
  1. 创建 base/logger/type.ts
  2. 创建 base/logger/proc.ts（5个级别 + child()）
  3. 创建 test/phase1/logger.test.ts

  🤖 使用子代理：
  Task: "Implement 5-level logger based on claude-hack reference"
  Prompt: "参考 ~/proj/claude-hack/base/logger/proc.ts 的实现，
  为 orange 项目实现 5-level logger，要求：
  1. debug/info/warn/error/fatal 五个级别
  2. ANSI 颜色输出
  3. child() 方法支持
  4. fatal 写入 crash.log"

  ✅ 自主验证：
  bun test base/logger/proc.test.ts
  # 期望：4 个测试通过
  # 手动检查控制台颜色输出

  Step 4: base/db - SQLite 数据库（60分钟）

  参考：
  - feature-design.md 第 32-122 行（Schema SQL）
  - acceptance-criteria.md 第 110-166 行（Database ACC）

  开发步骤：
  1. 创建 base/db/schema.sql（4张表 + 索引）
  2. 创建 base/db/type.ts（Database interface）
  3. 创建 base/db/proc.ts（使用 Bun SQLite API）
  4. 创建 test/phase1/db.test.ts

  ⚠️ 关键点：
  - 手写 SQL，不用 ORM
  - 使用 Bun 原生 SQLite: import { Database } from "bun:sqlite"
  - schema.sql 在初始化时执行

  🤖 使用子代理：
  Task: "Implement Database module with Bun SQLite"
  Prompt: "实现 base/db/proc.ts，要求：
  1. 使用 Bun 原生 SQLite API
  2. 初始化时执行 schema.sql
  3. 实现 createProject/getProject/createImage 等基础方法
  4. 参考 acceptance-criteria.md 的测试用例"

  ✅ 自主验证：
  bun test base/db/proc.test.ts
  # 期望：4 个测试通过
  # ✓ 四张表都创建了
  # ✓ 索引都建立了
  # ✓ 能插入和查询数据
  # ✓ 外键约束生效

  Step 5: base/storage - 文件系统（30分钟）

  参考：
  - acceptance-criteria.md 第 168-204 行（Storage ACC）

  开发步骤：
  1. 创建 base/storage/type.ts
  2. 创建 base/storage/proc.ts（使用 Bun fs API）
  3. 创建 test/phase1/storage.test.ts

  ✅ 自主验证：
  bun test base/storage/proc.test.ts
  # 期望：5 个测试通过

  Step 6: base/pubsub - 内存发布订阅（45分钟）

  参考：
  - feature-design.md 第 785-842 行（PubSub 实现）
  - acceptance-criteria.md 第 206-247 行（PubSub ACC）

  开发步骤：
  1. 创建 base/pubsub/type.ts
  2. 创建 base/pubsub/proc.ts（AsyncIterator 实现）
  3. 创建 test/phase1/pubsub.test.ts

  ⚠️ 关键点：
  - 使用 AsyncIterator 实现 subscribe()
  - 内存版本，不依赖 Redis

  ✅ 自主验证：
  bun test base/pubsub/proc.test.ts
  # 期望：2 个测试通过

  Step 7: Phase 1 整体验收（15分钟）

  创建统一测试入口：
  // test/phase1.test.ts
  import './phase1/config.test'
  import './phase1/logger.test'
  import './phase1/db.test'
  import './phase1/storage.test'
  import './phase1/pubsub.test'

  ✅ 最终验证：
  bun test:phase1
  # 期望：11 passed, 11 total, ~1s

  对照 ACC 检查清单：
  - Config loads from .env ✓
  - Config throws on missing required fields ✓
  - Logger outputs 5 levels with colors ✓
  - Logger child() creates scoped logger ✓
  - Database creates 4 tables with indexes ✓
  - Database enforces foreign key constraints ✓
  - Storage saves and reads files ✓
  - Storage creates nested directories ✓
  - PubSub publishes and subscribes ✓
  - PubSub supports multiple subscribers ✓
  - All base modules initialized successfully ✓

  ---
  🔑 关键原则

  1. 文档驱动开发

  - 每写一个模块前，先读 feature-design.md 的对应代码示例
  - 每写一个测试前，先读 acceptance-criteria.md 的对应验收点
  - 不要凭空想象，所有设计已经完成

  2. 测试驱动开发

  - 先写测试（基于 ACC）
  - 再写实现（基于 feature-design.md）
  - 最后验证（运行测试）

  3. 积极使用子代理

  何时用子代理：
  - ✅ 生成测试文件（基于 ACC）
  - ✅ 实现重复性代码（如 CRUD 方法）
  - ✅ 参考现有项目实现（如 claude-hack logger）

  何时不用子代理：
  - ❌ 架构决策（已经在设计文档中）
  - ❌ 核心逻辑（需要自己理解）
  - ❌ 小于 20 行的简单函数

  4. 自主验证每一步

  - 写完一个模块，立即运行测试
  - 不要等所有代码写完再测试
  - 红→绿→重构的节奏

  5. 遇到问题的处理

  - 先查 acceptance-criteria.md（是否理解错了验收条件）
  - 再查 feature-design.md（是否理解错了设计）
  - 最后查 system-design.md（是否理解错了整体架构）

  ---
  📊 进度追踪

  创建 TODO 列表追踪 Phase 1 进度：

  Phase 1: 基础设施
  - [ ] 项目初始化
  - [ ] base/config + 测试
  - [ ] base/logger + 测试
  - [ ] base/db + 测试
  - [ ] base/storage + 测试
  - [ ] base/pubsub + 测试
  - [ ] Phase 1 整体验收

  ---
  🎯 成功标准

  今天结束时应该达到：
  - ✅ 所有 base/ 模块实现完成
  - ✅ 11 个单元测试全部通过
  - ✅ 执行时间 < 2s
  - ✅ 无警告或错误日志
  - ✅ 代码符合 L3 + CFP 架构

  如果今天完成了 Phase 1：
  - 🎉 恭喜！可以开始 Phase 2
  - 📝 记录遇到的问题和解决方案
  - 🔄 更新 acceptance-criteria.md（如果发现 ACC 不合理）

  ---
  💡 温馨提示

  1. 不要急于求成 - Phase 1 是地基，宁可慢一点也要做扎实
  2. 多用并行工具调用 - Read 5 个文件，Write 1 个文件
  3. 保持代码简洁 - KISS > YAGNI > 过早优化
  4. 测试是朋友 - 测试通过 = 功能正确 = 可以继续前进

  祝明天开发顺利！🚀

  ---

  ## 🟡 给明天的你的额外建议

  ### 高效使用子代理的模式

  **模式 1：测试文件生成**
  ```typescript
  Task("Generate test based on ACC", `
  根据 .ctx/acceptance-criteria.md 第 X-Y 行，
  生成 test/phaseN/module.test.ts，
  包含所有验收点的测试用例
  `)

  模式 2：参考实现迁移
  Task("Port implementation from reference", `
  参考 ~/proj/claude-hack/base/logger/proc.ts，
  为 orange 项目实现类似功能，
  调整为符合 feature-design.md 的要求
  `)

  模式 3：CRUD 方法生成
  Task("Generate database methods", `
  基于 base/db/schema.sql 的表结构，
  生成 createProject, getProject, updateProject, deleteProject 等方法，
  使用 Bun SQLite API
  `)

  验证节奏

  写代码 (15min) → 运行测试 (30s) → 修复问题 (5min) → 再次测试 (30s)
                      ↓ 通过
              继续下一个模块

  不要：写完所有代码再测试 ❌而要：每个模块写完立即测试 ✅

  遇到困难时

  1. 测试不通过？
    - 对照 ACC 看期望是什么
    - 对照 feature-design.md 看实现是否正确
    - 打印中间结果调试
  2. 不知道怎么写？
    - 看 feature-design.md 的代码示例
    - 看 claude-hack 的参考实现
    - 让子代理帮你写初版
  3. 设计有问题？
    - 记录下来
    - 先按现有设计实现
    - Phase 1 完成后再讨论改进
