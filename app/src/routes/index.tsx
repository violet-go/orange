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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PeelPack 小贴纸机 🎨
          </h1>
          <p className="text-gray-600">
            {isRemix
              ? '🔄 基于已有项目重新生成'
              : '描述你想要的角色，AI 生成专属表情包'}
          </p>
          {isRemix && (
            <Button
              size="sm"
              variant="light"
              onPress={handleCancelRemix}
              className="mt-2"
            >
              ✕ 取消 Remix
            </Button>
          )}
        </div>

        <Card className="p-8">
          <CardBody className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">描述你想要的贴纸：</h2>

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：一只可爱的橘猫，大眼睛，圆脸"
                className="mb-2"
                autoFocus
                minRows={3}
                maxRows={6}
              />

              <p className="text-sm text-gray-500">
                提示：描述角色的外观、性格、风格
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">选择风格：</h3>
              <StylePicker selectedId={selectedStyleId} onSelect={setSelectedStyleId} />
            </div>

            <Button
              onClick={handleGenerate}
              isDisabled={!description.trim() || createProject.isPending}
              isLoading={createProject.isPending}
              className="w-full"
              size="lg"
              color="primary"
            >
              {createProject.isPending ? '生成中...' : '生成贴纸包 🎨'}
            </Button>
          </CardBody>
        </Card>
      </main>
    </div>
  )
}
