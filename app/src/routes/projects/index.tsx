import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, Card, CardBody, Chip, Spinner } from '@heroui/react'
import { graphqlClient } from '../../lib/graphql/client'
import { gql } from 'graphql-request'

const GET_PROJECTS_QUERY = gql`
  query GetProjects($limit: Int, $offset: Int, $status: String) {
    projects(limit: $limit, offset: $offset, status: $status) {
      nodeArray {
        id
        inputContent
        status
        createdAt
        style {
          id
          displayName
        }
        images(limit: 1) {
          fileUrl
        }
      }
      totalCount
      hasMore
    }
  }
`

export const Route = createFileRoute('/projects/')({
  component: ProjectListPage,
})

interface Project {
  id: string
  inputContent: string
  status: string
  createdAt: string
  style: {
    id: string
    displayName: string
  } | null
  images: Array<{
    fileUrl: string | null
  }>
}

interface ProjectsResponse {
  projects: {
    nodeArray: Project[]
    totalCount: number
    hasMore: boolean
  }
}

function ProjectListPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')

  const { data, isLoading } = useQuery({
    queryKey: ['projects', statusFilter, sortBy],
    queryFn: async () => {
      const response = await graphqlClient.request<ProjectsResponse>(
        GET_PROJECTS_QUERY,
        {
          limit: 20,
          offset: 0,
          status: statusFilter,
        }
      )
      return response.projects
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  const projectArray = data?.nodeArray || []

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">我的项目</h1>

          {/* Filter and Sort */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex gap-2">
              <Button
                size="sm"
                color={statusFilter === null ? 'primary' : 'default'}
                onPress={() => setStatusFilter(null)}
              >
                全部
              </Button>
              <Button
                size="sm"
                color={statusFilter === 'completed' ? 'primary' : 'default'}
                onPress={() => setStatusFilter('completed')}
              >
                已完成
              </Button>
              <Button
                size="sm"
                color={statusFilter === 'generating' ? 'primary' : 'default'}
                onPress={() => setStatusFilter('generating')}
              >
                生成中
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                color={sortBy === 'newest' ? 'primary' : 'default'}
                onPress={() => setSortBy('newest')}
              >
                最新
              </Button>
              <Button
                size="sm"
                color={sortBy === 'oldest' ? 'primary' : 'default'}
                onPress={() => setSortBy('oldest')}
              >
                最早
              </Button>
            </div>
          </div>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectArray.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onView={() => navigate({ to: `/projects/${project.id}` })}
            />
          ))}
        </div>

        {projectArray.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">还没有项目</p>
            <Button color="primary" onPress={() => navigate({ to: '/' })}>
              创建第一个项目
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function ProjectCard({
  project,
  onView,
}: {
  project: Project
  onView: () => void
}) {
  const statusConfig = {
    completed: { label: '已完成', color: 'success' as const },
    generating: { label: '生成中', color: 'warning' as const },
    failed: { label: '失败', color: 'danger' as const },
    partial_failed: { label: '部分失败', color: 'warning' as const },
  }

  const config =
    statusConfig[project.status as keyof typeof statusConfig] || {
      label: project.status,
      color: 'default' as const,
    }

  return (
    <Card
      isPressable
      onPress={onView}
      className="hover:shadow-lg transition-shadow"
    >
      <CardBody className="p-0">
        {/* Thumbnail */}
        <div className="aspect-square bg-gray-100 relative">
          {project.images[0]?.fileUrl ? (
            <img
              src={project.images[0].fileUrl}
              alt="thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-4xl">🎨</span>
            </div>
          )}
          <Chip color={config.color} size="sm" className="absolute top-2 right-2">
            {config.label}
          </Chip>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {project.inputContent}
          </p>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{project.style?.displayName || '无风格'}</span>
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
