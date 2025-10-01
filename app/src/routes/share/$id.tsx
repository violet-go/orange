import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, CardBody, Spinner } from '@heroui/react'
import { graphqlClient } from '../../lib/graphql/client'
import { GET_PROJECT_QUERY } from '../../lib/graphql/queries'

export const Route = createFileRoute('/share/$id')({
  component: SharePage,
})

interface Image {
  id: string
  category: string
  emotionType: string | null
  fileUrl: string | null
  status: string
}

interface Project {
  id: string
  inputContent: string
  status: string
  style: {
    displayName: string
  } | null
  images: Image[]
}

interface ProjectResponse {
  project: Project
}

const EMOTION_LABELS: Record<string, string> = {
  happy: '开心',
  sad: '难过',
  angry: '生气',
  surprised: '惊讶',
  thinking: '思考',
  shy: '害羞',
  proud: '骄傲',
  tired: '疲倦',
  love: '爱心',
}

function SharePage() {
  const { id } = Route.useParams()

  const { data: project, isLoading } = useQuery({
    queryKey: ['share-project', id],
    queryFn: async () => {
      const response = await graphqlClient.request<ProjectResponse>(
        GET_PROJECT_QUERY,
        { id }
      )
      return response.project
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardBody>
            <p className="text-gray-500">项目不存在或已被删除</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  const emotionImageArray = project.images.filter(
    (img) => img.category === 'emotion' && img.status === 'success'
  )
  const surpriseImageArray = project.images.filter(
    (img) => img.category === 'surprise' && img.status === 'success'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">PeelPack 作品分享</h1>
          <p className="text-gray-600 mb-4">{project.inputContent}</p>
          {project.style && (
            <p className="text-sm text-gray-500 mb-4">
              风格：{project.style.displayName}
            </p>
          )}
          <Button
            color="primary"
            size="lg"
            onPress={() => (window.location.href = '/')}
          >
            🎨 我也要生成
          </Button>
        </div>

        <div className="space-y-8">
          {/* Emotion images */}
          {emotionImageArray.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">九宫格情绪表情：</h2>
              <div className="grid grid-cols-3 gap-4">
                {emotionImageArray.map((image) => (
                  <Card key={image.id} className="aspect-square overflow-hidden">
                    <CardBody className="p-0 relative">
                      <img
                        src={image.fileUrl || ''}
                        alt={image.emotionType || 'emotion'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <p className="text-white text-sm font-medium text-center">
                          {image.emotionType
                            ? EMOTION_LABELS[image.emotionType] ||
                              image.emotionType
                            : ''}
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Surprise images */}
          {surpriseImageArray.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">意外表情：</h2>
              <div className="grid grid-cols-7 gap-3 overflow-x-auto">
                {surpriseImageArray.map((image) => (
                  <Card key={image.id} className="aspect-square overflow-hidden">
                    <CardBody className="p-0">
                      <img
                        src={image.fileUrl || ''}
                        alt="surprise"
                        className="w-full h-full object-cover"
                      />
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
