import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Card, CardBody, Textarea } from '@heroui/react'
import { graphqlClient } from '../lib/graphql/client'
import { CREATE_PROJECT_MUTATION } from '../lib/graphql/mutations'
import { StylePicker } from '../components/StylePicker'

export const Route = createFileRoute('/')({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      remix: (search.remix as string) || null,
      description: (search.description as string) || '',
      styleId: (search.styleId as string) || null,
    }
  },
})

interface CreateProjectInput {
  inputType: string
  inputContent: string
  styleId?: string | null
  remixFromId?: string | null
}

interface CreateProjectResponse {
  createProject: {
    project: {
      id: string
      status: string
      createdAt: string
    }
  }
}

function HomePage() {
  const search = useSearch({ from: '/' })
  const [description, setDescription] = useState(search.description || '')
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(
    search.styleId || null
  )
  const navigate = useNavigate()

  const isRemix = !!search.remix

  // Update state when search params change
  useEffect(() => {
    if (search.description) {
      setDescription(search.description)
    }
    if (search.styleId) {
      setSelectedStyleId(search.styleId)
    }
  }, [search.description, search.styleId])

  const createProject = useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const response = await graphqlClient.request<CreateProjectResponse>(
        CREATE_PROJECT_MUTATION,
        { input }
      )
      return response.createProject
    },
    onSuccess: (data) => {
      // Navigate to project detail page
      navigate({ to: `/projects/${data.project.id}` })
    },
    onError: (error) => {
      console.error('Generation failed:', error)
      alert('生成失败，请重试')
    },
  })

  const handleGenerate = () => {
    if (!description.trim()) return

    createProject.mutate({
      inputType: 'TEXT',
      inputContent: description,
      styleId: selectedStyleId,
      remixFromId: search.remix || null,
    })
  }

  const handleCancelRemix = () => {
    navigate({ to: '/', search: {} })
    setDescription('')
    setSelectedStyleId(null)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-pink-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      </div>

      {/* Floating orbs for visual interest */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

      <main className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            <span className="text-sm font-medium text-gray-700">
              {isRemix ? '🔄 Remix Mode' : '✨ AI-Powered'}
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            PeelPack 小贴纸机
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            {isRemix
              ? '基于已有项目，生成全新表情包变体'
              : '描述你的创意，AI 为你生成专属表情包'}
          </p>

          {isRemix && (
            <Button
              size="sm"
              variant="flat"
              onPress={handleCancelRemix}
              className="mt-2"
              color="secondary"
            >
              ✕ 取消 Remix
            </Button>
          )}
        </div>

        {/* Main Card */}
        <Card
          className="glass-card border-0 shadow-2xl overflow-hidden animate-scale-in"
          style={{ animationDelay: '0.2s' }}
        >
          <CardBody className="p-8 sm:p-12 space-y-8">
            {/* Input Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl">✍️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">描述你的创意</h2>
              </div>

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：一只可爱的橘猫，大眼睛，圆圆的脸蛋，带着围巾..."
                className="mb-2"
                classNames={{
                  input: "text-lg",
                  inputWrapper: "bg-white/50 backdrop-blur-sm border-2 border-violet-100 hover:border-violet-300 focus-within:border-violet-500 transition-colors",
                }}
                autoFocus
                minRows={4}
                maxRows={8}
                size="lg"
              />

              <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-50/50 border border-violet-100">
                <span className="text-violet-600 text-sm">💡</span>
                <p className="text-sm text-violet-900/70">
                  提示：详细描述角色的外观、性格特征、配色风格，AI 会生成更精准的结果
                </p>
              </div>
            </div>

            {/* Style Picker Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl">🎨</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">选择艺术风格</h3>
              </div>

              <StylePicker selectedId={selectedStyleId} onSelect={setSelectedStyleId} />
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleGenerate}
              isDisabled={!description.trim() || createProject.isPending}
              isLoading={createProject.isPending}
              className="w-full h-14 text-lg font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all"
              size="lg"
              color="primary"
              radius="lg"
            >
              {createProject.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI 创作中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>🚀</span>
                  开始生成专属表情包
                </span>
              )}
            </Button>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-xs text-gray-600 font-medium">快速生成</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🎭</div>
                <div className="text-xs text-gray-600 font-medium">9种表情</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">✨</div>
                <div className="text-xs text-gray-600 font-medium">AI驱动</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Bottom decoration */}
        <div className="text-center mt-12 text-sm text-gray-500 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p>由 Google Gemini 2.0 Flash 驱动 · 支持 Remix 和自定义风格</p>
        </div>
      </main>
    </div>
  )
}
