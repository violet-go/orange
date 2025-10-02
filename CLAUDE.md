
## 🔴 CRITICAL SAFETY RULES - 生存约束

**NEVER EVER execute these commands - they will kill Claude Code itself:**
- ❌ `pkill -f "bun.*index.ts"` - KILLS SELF
- ❌ `pkill -f bun` - KILLS SELF
- ❌ `killall bun` - KILLS SELF

**Correct way to stop test servers:**
- ✅ Track server PID: `bun run index.ts & SERVER_PID=$!`
- ✅ Kill specific PID: `kill $SERVER_PID`
- ✅ Or let trap/cleanup handle it in scripts

**Remember: Claude Code runs on Bun. Killing Bun = suicide.**

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Project Notes

### Style Presets - 风格预设 [2025-10-02]

**问题**: 主页只显示"默认风格"，缺少预设风格选项
**原因**: `styles` 表为空，数据库 schema 存在但未插入初始数据
**解决**: 创建 `base/db/seed-styles.ts` 脚本插入 6 个预设风格
  - 可爱卡通 (cute-cartoon)
  - 日系动漫 (anime)
  - 3D立体 (3d-render)
  - 水彩画 (watercolor)
  - 像素艺术 (pixel-art)
  - 简笔画 (line-art)

**使用方式**: `bun run seed:styles` 或 `bun run base/db/seed-styles.ts`
**架构流程**: Frontend StylePicker → GraphQL `styles` query → `db.getActiveStyles()` → SQLite `styles` table

### Prompt 组合优化 [2025-10-02]

**问题**: Prompt 组合顺序不合理，风格模板在前，用户描述在后
**原因**: `core/gen/proc.ts:42` 中使用 `${style.promptTemplate}, ${params.inputContent}`
**影响**: AI 模型对前面的词汇赋予更高权重，导致风格优先于主体描述
**修复**: 调整为 `${params.inputContent}, ${style.promptTemplate}`
**最佳实践**: 主体描述 → 风格修饰 → 情绪/场景细节

**Prompt 组合流程**:
1. GenService: `用户描述 + 风格模板` → basePrompt
2. PromptBuilder: `basePrompt + 情绪模板` → 9 个情绪 prompt
3. PromptBuilder: `basePrompt + 场景模板` → 7 个惊喜 prompt

### ShowCase 示例功能 [2025-10-02]

**需求**: 小白用户不想打字，需要一键开始创作
**实现**: 创建 `app/src/components/ShowcaseExamples.tsx`
**功能**: 12 个预设角色描述，点击自动填充到输入框
**分类**:
  - 可爱动物系列（橘猫、柴犬、熊猫、兔子）
  - 职业角色系列（程序员、厨师、画家）
  - 幻想生物系列（小龙、独角兽）
  - 食物拟人化系列（饺子、奶茶、寿司）
**交互**: 点击卡片 → 自动填充描述 → 自动聚焦输入框 → 平滑滚动到输入区域

### Image Upload Support - 图片上传支持 [2025-01-XX]

**需求**: 支持用户上传图片作为输入，实现 Image-to-Image 和 Text+Image-to-Image 生成
**底层 API**: Gemini 2.5 Flash Image Preview 原生支持图片输入（最多 3 张）
**实现层次**:
  - **类型定义** (`core/image/type.ts`): 添加 `inputImage?: { mimeType, base64Data }` 到 `ImageGenParams`
  - **API 调用** (`core/image/proc.ts`): 修改 `createRealImageGen`，将图片作为 `inline_data` 添加到请求 parts
  - **业务逻辑** (`core/gen/proc.ts`): 解析 `inputContent` JSON，提取图片数据，传递给所有 16 张图片生成
  - **前端组件** (`app/src/components/ImageUpload.tsx`): 拖拽/点击上传，base64 编码，预览显示
  - **主页集成** (`app/src/routes/index.tsx`): 根据有无图片/文本自动切换 TEXT/IMAGE/MIXED 模式

**数据流**:
1. Frontend: File → base64 + mimeType → state
2. GraphQL: `inputContent` = JSON.stringify({ text?, base64Data, mimeType })
3. GenService: Parse JSON → extract inputImage → pass to all 16 images
4. ImageGen: Build parts array → [inline_data, text] → Gemini API

**输入类型语义**:
- `TEXT`: inputContent = 纯文本描述
- `IMAGE`: inputContent = JSON `{ base64Data, mimeType }`
- `MIXED`: inputContent = JSON `{ text, base64Data, mimeType }`

**向后兼容**: TEXT 模式行为完全不变，IMAGE/MIXED 为新增功能
