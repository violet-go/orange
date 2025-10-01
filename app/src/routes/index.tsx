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
    <div className="min-h-screen relative overflow-hidden bg-white">
      {/* Premium gradient mesh background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-pink-50" />

        {/* Radial gradients for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.12),transparent_50%)]" />

        {/* Mesh overlay */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(124, 58, 237, 0.08) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }} />
      </div>

      {/* Floating orbs with blur */}
      <div className="absolute top-20 -left-20 w-80 h-80 bg-gradient-to-br from-violet-400/30 to-purple-400/20 rounded-full blur-3xl animate-float" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-to-br from-pink-400/25 to-rose-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-purple-300/10 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />

      <main className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-slide-up">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-xl shadow-lg shadow-violet-500/10 border border-violet-100/50 mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-600"></span>
            </span>
            <span className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              {isRemix ? 'Remix Mode' : 'AI-Powered Creation'}
            </span>
          </div>

          {/* Main title with refined typography */}
          <h1 className="text-6xl sm:text-7xl font-bold mb-6 tracking-tight">
            <span className="inline-block bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              PeelPack
            </span>
            <br />
            <span className="text-4xl sm:text-5xl font-semibold text-gray-900/80">
              AI 表情包创作平台
            </span>
          </h1>

          {/* Subtitle with better hierarchy */}
          <p className="text-xl sm:text-2xl text-gray-600/90 max-w-2xl mx-auto mb-4 leading-relaxed font-light">
            {isRemix
              ? '基于现有作品，探索无限创意可能'
              : '一句话描述，AI 为你生成专属表情包'}
          </p>

          {/* Feature tags */}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mb-6">
            <div className="flex items-center gap-1.5">
              <span className="text-violet-500">⚡</span>
              <span>快速生成</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <div className="flex items-center gap-1.5">
              <span className="text-purple-500">🎨</span>
              <span>多种风格</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <div className="flex items-center gap-1.5">
              <span className="text-pink-500">✨</span>
              <span>高清输出</span>
            </div>
          </div>

          {isRemix && (
            <Button
              size="sm"
              variant="flat"
              onPress={handleCancelRemix}
              className="mt-2 border border-pink-200 bg-pink-50/50"
              color="secondary"
            >
              <span className="flex items-center gap-1.5">
                <span>✕</span>
                <span>取消 Remix</span>
              </span>
            </Button>
          )}
        </div>

        {/* Main Card with premium styling */}
        <Card
          className="bg-white/70 backdrop-blur-2xl border border-gray-200/50 shadow-2xl shadow-violet-500/10 overflow-hidden animate-scale-in"
          style={{ animationDelay: '0.2s' }}
        >
          <CardBody className="p-8 sm:p-12 space-y-10">
            {/* Input Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <span className="text-white text-2xl">✍️</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">描述你的创意</h2>
                  <p className="text-sm text-gray-500 mt-0.5">越详细越好，AI 会理解你的想法</p>
                </div>
              </div>

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：一只可爱的橘猫，圆圆的大眼睛，粉色的小鼻子，戴着蓝色围巾，毛茸茸的，卡通风格..."
                classNames={{
                  base: "mb-3",
                  input: "text-lg leading-relaxed",
                  inputWrapper: "bg-white border-2 border-gray-200/80 hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all duration-300 shadow-sm",
                }}
                autoFocus
                minRows={5}
                maxRows={10}
                size="lg"
                radius="lg"
              />

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/30 border border-violet-100/50">
                <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-violet-600 text-sm">💡</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-violet-900/80 leading-relaxed">
                    <span className="font-semibold">创作提示：</span>描述角色的外观特征、性格表现、配色方案、艺术风格等，AI 会生成更符合你预期的表情包
                  </p>
                </div>
              </div>
            </div>

            {/* Style Picker Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                    <span className="text-white text-2xl">🎨</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-white"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">选择艺术风格</h3>
                  <p className="text-sm text-gray-500 mt-0.5">可选，不选则使用默认风格</p>
                </div>
              </div>

              <StylePicker selectedId={selectedStyleId} onSelect={setSelectedStyleId} />
            </div>

            {/* Divider with gradient */}
            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
              </div>
            </div>

            {/* CTA Button with premium styling */}
            <div className="space-y-4">
              <Button
                onClick={handleGenerate}
                isDisabled={!description.trim() || createProject.isPending}
                isLoading={createProject.isPending}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-700 hover:via-purple-700 hover:to-pink-700 shadow-2xl shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                size="lg"
                radius="xl"
              >
                {createProject.isPending ? (
                  <span className="flex items-center gap-3">
                    <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>AI 创作中...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">🚀</span>
                    <span>开始生成专属表情包</span>
                  </span>
                )}
              </Button>

              {/* Feature highlights with refined design */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-violet-50 to-transparent hover:from-violet-100 transition-colors">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="text-xs font-semibold text-gray-700">30秒极速</div>
                  <div className="text-xs text-gray-500 mt-0.5">快速生成</div>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-purple-50 to-transparent hover:from-purple-100 transition-colors">
                  <div className="text-3xl mb-2">🎭</div>
                  <div className="text-xs font-semibold text-gray-700">9+表情</div>
                  <div className="text-xs text-gray-500 mt-0.5">丰富场景</div>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-pink-50 to-transparent hover:from-pink-100 transition-colors">
                  <div className="text-3xl mb-2">✨</div>
                  <div className="text-xs font-semibold text-gray-700">HD 高清</div>
                  <div className="text-xs text-gray-500 mt-0.5">AI 驱动</div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Bottom info with refined typography */}
        <div className="text-center mt-16 space-y-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span>由</span>
            <span className="font-semibold text-violet-600">Google Gemini 2.0 Flash</span>
            <span>驱动</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>✓ Remix 支持</span>
            <span>•</span>
            <span>✓ 自定义风格</span>
            <span>•</span>
            <span>✓ 批量下载</span>
          </div>
        </div>
      </main>
    </div>
  )
}
