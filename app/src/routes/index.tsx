import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { graphqlClient } from '../lib/graphql/client'
import { CREATE_PROJECT_MUTATION } from '../lib/graphql/mutations'
import { StylePicker } from '../components/StylePicker'
import { ShowcaseExamples } from '../components/ShowcaseExamples'

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
      {/* Background Effects */}
      <div className="background-container">
        <div className="grid-background"></div>
        <div className="grid-accent"></div>
        <div className="rainbow-dots">
          <span className="rainbow-dot"></span>
          <span className="rainbow-dot"></span>
          <span className="rainbow-dot"></span>
          <span className="rainbow-dot"></span>
          <span className="rainbow-dot"></span>
          <span className="rainbow-dot"></span>
        </div>
      </div>

      {/* Hero Section - 添加顶部内边距避让导航栏 */}
      <main className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20" style={{
        paddingLeft: 'clamp(var(--space-4), 4vw, var(--space-12))',
        paddingRight: 'clamp(var(--space-4), 4vw, var(--space-12))'
      }}>
        {/* Hero Content */}
        <div className="text-center max-w-4xl mx-auto mb-12 animate-slide-up">
          {/* Hero Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full relative" style={{
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid transparent'
          }}>
            <div className="absolute inset-[-2px] rounded-full opacity-75" style={{
              background: 'var(--gradient-rainbow)',
              zIndex: -1,
              animation: 'rainbow-rotate 3s linear infinite'
            }}></div>
            <span className="inline-block w-4 h-4 animate-sparkle">✨</span>
            <span className="text-sm font-medium text-white">
              {isRemix ? 'Remix Mode' : 'Early access'}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="mb-4" style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
            fontWeight: 700,
            lineHeight: 1.1
          }}>
            <span className="block text-white mb-2">
              {isRemix ? '基于现有作品探索' : 'Create the work solution of'}
            </span>
            <span className="block text-white mb-2">
              {isRemix ? '无限创意可能用' : 'your dreams with'} <span className="rainbow-text">AI</span>
            </span>
          </h1>

          {/* Subtitle - 增加底部间距到 var(--space-16) = 64px */}
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light" style={{ marginBottom: 'var(--space-16)' }}>
            {isRemix
              ? '一句话描述，AI 为你生成全新表情包'
              : 'Use AI to create whatever you need for your sticker pack in seconds'}
          </p>

          {/* Input Container with Rainbow Ring - 优化结构和间距 */}
          <div className="relative max-w-3xl mx-auto" style={{ marginBottom: 'var(--space-12)' }}>
            <div className="input-wrapper">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：一只可爱的橘猫，圆圆的大眼睛，粉色的小鼻子，戴着蓝色围巾..."
                className="main-input"
                rows={3}
                autoFocus
              />
              <div className="input-actions">
                <button
                  onClick={handleGenerate}
                  disabled={!description.trim() || createProject.isPending}
                  className="magic-button"
                >
                  <span className="magic-button-shimmer"></span>
                  {createProject.isPending ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Create with magic</span>
                      <span className="magic-sparkle">✨</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Style Picker Section - Compact */}
          {selectedStyleId && (
            <div className="mb-6">
              <button
                onClick={() => setSelectedStyleId(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-gray-400 hover:text-white transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
              >
                <span>风格已选</span>
                <span>✕</span>
              </button>
            </div>
          )}

          {/* ShowCase Examples - 一键开始创作 */}
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <ShowcaseExamples
              onSelect={(desc) => {
                setDescription(desc)
                // Auto-scroll to input area
                setTimeout(() => {
                  const textarea = document.querySelector('.main-input') as HTMLTextAreaElement
                  textarea?.focus()
                  textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 100)
              }}
            />
          </div>

          {/* Preset Tags - 优化间距和布局 */}
          <div className="preset-tags" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="tags-container">
              <StylePicker
                selectedId={selectedStyleId}
                onSelect={setSelectedStyleId}
              />
            </div>
          </div>

          {/* Remix Cancel Button */}
          {isRemix && (
            <button
              onClick={handleCancelRemix}
              className="px-4 py-2 rounded-full text-sm text-gray-400 hover:text-white transition-colors"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              ✕ 取消 Remix
            </button>
          )}
        </div>

        {/* Floating Geometric Decorations - 背景几何装饰 */}
        <div className="geometric-decorations">
          {[
            { shape: '♦', x: '8%', y: '15%', size: '24px', delay: 0, color: 1 },
            { shape: '◆', x: '85%', y: '25%', size: '18px', delay: 1.2, color: 2 },
            { shape: '●', x: '12%', y: '65%', size: '20px', delay: 2.4, color: 3 },
            { shape: '▲', x: '92%', y: '45%', size: '22px', delay: 3.6, color: 4 },
            { shape: '■', x: '5%', y: '85%', size: '16px', delay: 4.8, color: 5 },
            { shape: '★', x: '88%', y: '75%', size: '20px', delay: 6, color: 6 },
            { shape: '◆', x: '45%', y: '12%', size: '14px', delay: 1.8, color: 1 },
            { shape: '●', x: '65%', y: '88%', size: '18px', delay: 3, color: 3 },
            { shape: '▲', x: '25%', y: '35%', size: '16px', delay: 4.2, color: 4 },
            { shape: '★', x: '75%', y: '55%', size: '14px', delay: 5.4, color: 6 },
          ].map((item, i) => (
            <span
              key={i}
              className="geometric-shape"
              style={{
                left: item.x,
                top: item.y,
                fontSize: item.size,
                color: `var(--color-rainbow-${item.color})`,
                animationDelay: `${item.delay}s`
              }}
            >
              {item.shape}
            </span>
          ))}
        </div>

        {/* Footer Text */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-center z-10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p className="text-gray-600 text-xs opacity-80">
            Powered by nano banana model · 已服务 2K+ 创作者
          </p>
        </div>
      </main>
    </div>
  )
}
