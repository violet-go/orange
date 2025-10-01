# Hero UI 快速启动指南

## 🚀 5 分钟配置（必做）

### Step 1: 安装依赖

```bash
cd app/

# 安装 Hero UI 和依赖
bun add @heroui/react framer-motion

# 确认安装成功
bun pm ls | grep heroui
# 应显示：@heroui/react@x.x.x
```

### Step 2: 配置 Tailwind CSS

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'
import { heroui } from '@heroui/react'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {}
  },
  darkMode: 'class',
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#9333ea', // 紫色
              foreground: '#ffffff'
            },
            secondary: {
              DEFAULT: '#ec4899', // 粉色
              foreground: '#ffffff'
            }
          }
        }
      }
    })
  ]
} satisfies Config
```

### Step 3: 添加 Provider

```tsx
// app/root.tsx
import { HeroUIProvider } from '@heroui/react'
import { Outlet } from '@tanstack/react-router'

export default function Root() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PeelPack - 小贴纸机</title>
      </head>
      <body>
        <HeroUIProvider>
          <Outlet />
        </HeroUIProvider>
      </body>
    </html>
  )
}
```

### Step 4: 验证安装

```tsx
// app/routes/index.tsx
import { Button } from '@heroui/react'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Button color="primary" size="lg">
        🎉 Hero UI 安装成功！
      </Button>
    </div>
  )
}
```

```bash
# 启动开发服务器
bun run dev

# 打开浏览器
open http://localhost:5173

# 应该看到一个紫色的按钮
```

---

## 📚 常用组件速查

### Button - 按钮

```tsx
import { Button } from '@heroui/react'

// 基础用法
<Button color="primary">点击我</Button>

// 变体
<Button color="primary" variant="solid">实心</Button>
<Button color="primary" variant="bordered">边框</Button>
<Button color="primary" variant="ghost">幽灵</Button>
<Button color="primary" variant="flat">扁平</Button>

// 尺寸
<Button size="sm">小</Button>
<Button size="md">中</Button>
<Button size="lg">大</Button>

// 状态
<Button isLoading>加载中</Button>
<Button isDisabled>禁用</Button>

// 图标
<Button startContent={<Icon />}>开始图标</Button>
<Button endContent={<Icon />}>结束图标</Button>

// 完整示例
<Button
  color="primary"
  size="lg"
  isLoading={isGenerating}
  isDisabled={!description}
  onClick={handleGenerate}
>
  生成贴纸包
</Button>
```

### Card - 卡片

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/react'

<Card>
  <CardHeader>
    <h3>标题</h3>
  </CardHeader>
  <CardBody>
    <p>内容</p>
  </CardBody>
  <CardFooter>
    <Button>操作</Button>
  </CardFooter>
</Card>

// 可点击卡片
<Card isPressable onPress={() => console.log('clicked')}>
  <CardBody>点击我</CardBody>
</Card>

// Hover 效果
<Card isHoverable>
  <CardBody>悬停我</CardBody>
</Card>
```

### Input / Textarea - 输入框

```tsx
import { Input, Textarea } from '@heroui/react'

// Input
<Input
  label="邮箱"
  placeholder="输入邮箱"
  type="email"
  variant="bordered"
/>

// Textarea
<Textarea
  label="描述"
  placeholder="描述你想要的贴纸"
  minRows={3}
  variant="bordered"
  autoFocus
/>

// 验证
<Input
  label="密码"
  type="password"
  isInvalid={!isValid}
  errorMessage="密码至少 8 位"
/>

// 完整示例
<Textarea
  label="描述你想要的贴纸"
  placeholder="例如：一只可爱的橘猫，大眼睛，圆脸"
  value={description}
  onValueChange={setDescription}
  variant="bordered"
  minRows={4}
  autoFocus
  description="提示：描述角色的外观、性格、风格"
/>
```

### Progress - 进度条

```tsx
import { Progress } from '@heroui/react'

// 基础用法
<Progress value={60} />

// 带标签
<Progress
  label="生成进度"
  value={current}
  maxValue={total}
  showValueLabel
/>

// 颜色
<Progress value={60} color="primary" />
<Progress value={60} color="success" />
<Progress value={60} color="warning" />
<Progress value={60} color="danger" />

// 完整示例
<Progress
  label="正在生成贴纸包"
  value={completedCount}
  maxValue={totalCount}
  color="primary"
  showValueLabel
  className="max-w-md"
  formatOptions={{ style: 'decimal' }}
/>
```

### Spinner - 加载动画

```tsx
import { Spinner } from '@heroui/react'

// 基础用法
<Spinner />

// 尺寸
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />

// 颜色
<Spinner color="primary" />
<Spinner color="success" />

// 带标签
<Spinner label="加载中..." />
```

### Skeleton - 骨架屏

```tsx
import { Skeleton } from '@heroui/react'

// 基础用法
<Skeleton className="rounded-lg">
  <div className="h-24 rounded-lg bg-default-300"></div>
</Skeleton>

// 多行骨架
<div className="space-y-3">
  <Skeleton className="w-3/5 rounded-lg">
    <div className="h-3 w-3/5 rounded-lg bg-default-200"></div>
  </Skeleton>
  <Skeleton className="w-4/5 rounded-lg">
    <div className="h-3 w-4/5 rounded-lg bg-default-200"></div>
  </Skeleton>
  <Skeleton className="w-2/5 rounded-lg">
    <div className="h-3 w-2/5 rounded-lg bg-default-300"></div>
  </Skeleton>
</div>

// 图片骨架屏（完美用于 ImageCard）
<Skeleton className="rounded-lg aspect-square">
  <div className="aspect-square rounded-lg bg-default-300"></div>
</Skeleton>
```

### Modal - 模态框

```tsx
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@heroui/react'

function MyComponent() {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button onPress={onOpen}>打开</Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>标题</ModalHeader>
          <ModalBody>
            <p>内容</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>取消</Button>
            <Button color="primary" onPress={onClose}>确定</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

// Lightbox 示例
<Modal
  isOpen={isOpen}
  onClose={onClose}
  size="full"
  backdrop="blur"
>
  <ModalContent>
    <ModalBody className="flex items-center justify-center">
      <img src={image.fileUrl} alt={image.emotionType} />
    </ModalBody>
  </ModalContent>
</Modal>
```

### Divider - 分割线

```tsx
import { Divider } from '@heroui/react'

<Divider />
<Divider className="my-4" />
```

---

## 🎨 主题定制

### 颜色系统

```typescript
// tailwind.config.ts
plugins: [
  heroui({
    themes: {
      light: {
        colors: {
          // 主色
          primary: {
            DEFAULT: '#9333ea',
            foreground: '#ffffff',
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            // ... 完整色阶
            900: '#581c87'
          },
          // 次要色
          secondary: {
            DEFAULT: '#ec4899',
            foreground: '#ffffff'
          },
          // 成功/警告/错误
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444'
        }
      },
      dark: {
        colors: {
          // 暗黑主题配色
        }
      }
    }
  })
]
```

### 使用主题色

```tsx
// 使用预定义颜色
<Button color="primary">主色按钮</Button>
<Button color="secondary">次要色按钮</Button>
<Button color="success">成功按钮</Button>
<Button color="warning">警告按钮</Button>
<Button color="danger">危险按钮</Button>

// 使用 Tailwind 类名
<div className="bg-primary text-primary-foreground">
  紫色背景，白色文字
</div>
```

---

## 💡 实战示例

### 首页生成器

```tsx
// app/routes/index.tsx
import { Button, Textarea, Card } from '@heroui/react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

export default function GeneratorPage() {
  const [description, setDescription] = useState('')

  const createProject = useMutation({
    mutationFn: async (input) => {
      // GraphQL Mutation
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-8 text-center">
            PeelPack 小贴纸机
          </h1>

          <Textarea
            label="描述你想要的贴纸"
            placeholder="例如：一只可爱的橘猫，大眼睛，圆脸"
            value={description}
            onValueChange={setDescription}
            variant="bordered"
            minRows={4}
            autoFocus
            description="提示：描述角色的外观、性格、风格"
            classNames={{
              input: "text-lg"
            }}
          />

          <Button
            color="primary"
            size="lg"
            className="w-full mt-6"
            isLoading={createProject.isPending}
            isDisabled={!description.trim()}
            onPress={() => createProject.mutate({ inputContent: description })}
          >
            {createProject.isPending ? '生成中...' : '生成贴纸包 🎨'}
          </Button>
        </Card>
      </div>
    </div>
  )
}
```

### 进度监控器

```tsx
// app/components/ProgressMonitor.tsx
import { Progress, Card, Skeleton } from '@heroui/react'

export function ProgressMonitor({ current, total }: { current: number; total: number }) {
  const percentage = (current / total) * 100

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Progress
          label="正在生成贴纸包"
          value={percentage}
          color="primary"
          showValueLabel
          formatOptions={{ style: 'percent' }}
          className="max-w-full"
        />

        <p className="text-sm text-default-500 mt-3 text-center">
          已完成 {current} / {total} 张
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="rounded-lg aspect-square">
            <div className="aspect-square rounded-lg bg-default-300" />
          </Skeleton>
        ))}
      </div>
    </div>
  )
}
```

### 图片网格

```tsx
// app/components/ImageGrid.tsx
import { Card, CardBody } from '@heroui/react'

export function ImageGrid({ images }: { images: Image[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((image) => (
        <Card
          key={image.id}
          isPressable
          isHoverable
          onPress={() => openLightbox(image.id)}
        >
          <CardBody className="p-0 overflow-hidden">
            <img
              src={image.fileUrl}
              alt={image.emotionType}
              className="w-full h-full object-cover"
            />
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
```

---

## 🔥 Hero UI vs 手写对比

### Button 组件

**手写版本**（80 行代码）：
```tsx
// components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function Button({ variant = 'primary', size = 'md', isLoading, ... }: ButtonProps) {
  const baseStyles = 'rounded-lg font-medium transition-all duration-200...'
  const variantStyles = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500...',
    secondary: 'bg-white border-2 border-gray-300...',
    ghost: 'bg-transparent text-gray-600...'
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
      {isLoading && <Spinner />}
      {children}
    </button>
  )
}
```

**Hero UI 版本**（0 行代码）：
```tsx
import { Button } from '@heroui/react'

<Button color="primary" size="lg" isLoading={isPending}>
  生成
</Button>
```

**时间节省**：30 分钟 → 0 分钟

---

## 📖 Hero UI 文档

官方文档：https://www.heroui.com/docs/guide/introduction

常用页面：
- 组件列表：https://www.heroui.com/docs/components/button
- 主题配置：https://www.heroui.com/docs/customization/theme
- 示例代码：https://www.heroui.com/examples

---

## ✅ 验收清单

配置完成后检查：

```bash
# 1. 依赖已安装
□ @heroui/react 已安装
□ framer-motion 已安装

# 2. 配置文件正确
□ tailwind.config.ts 包含 heroui() 插件
□ tailwind.config.ts content 包含 node_modules/@heroui/react

# 3. Provider 已添加
□ app/root.tsx 包含 <HeroUIProvider>

# 4. 验证页面可用
□ 启动 bun run dev
□ 打开 http://localhost:5173
□ 看到 Hero UI 按钮样式

# 5. 开发工具就绪
□ VS Code 安装 Tailwind CSS IntelliSense
□ 浏览器安装 React DevTools
```

---

**配置完成！开始使用 Hero UI 快速开发吧！** 🚀
