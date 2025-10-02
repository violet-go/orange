import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-t-transparent rounded-full animate-spin"
               style={{
                 borderImage: 'var(--gradient-rainbow) 1',
                 borderImageSlice: 1
               }} />
          <p className="text-gray-400 mt-4 animate-pulse">加载中...</p>
        </div>
      </div>
    )
  }

  const projectArray = data?.nodeArray || []
  const sortedProjects = [...projectArray].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB
  })

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects - 与主页一致 */}
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

      <main className="relative mx-auto w-full" style={{
        maxWidth: '1440px',
        paddingTop: '120px',
        paddingBottom: '80px',
        paddingLeft: 'clamp(var(--space-4), 4vw, var(--space-12))',
        paddingRight: 'clamp(var(--space-4), 4vw, var(--space-12))'
      }}>
        {/* Page Header - 增加底部间距 */}
        <div className="animate-slide-up" style={{ marginBottom: 'var(--space-16)' }}>
          <h1 className="text-4xl font-bold mb-3">
            <span className="text-white">我的</span>
            <span className="rainbow-text ml-2">创作</span>
          </h1>
          <p className="text-gray-400">管理和查看所有的表情包项目</p>
        </div>

        {/* Filter Controls - 增加底部间距和内边距 */}
        <div className="animate-scale-in" style={{
          animationDelay: '0.1s',
          marginBottom: 'var(--space-12)',
          padding: 'var(--space-6)',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--color-grid-line)',
          borderRadius: 'var(--radius-xl)',
          backdropFilter: 'var(--backdrop-blur)'
        }}>
          <div className="flex flex-col sm:flex-row sm:justify-between" style={{ gap: 'var(--space-6)' }}>
            {/* Status Filter */}
            <div className="filter-group w-full sm:w-auto">
              <span className="text-gray-500 text-sm font-medium" style={{ marginRight: 'var(--space-4)', minWidth: '48px' }}>状态：</span>
              {[
                { value: null, label: '全部', icon: '🎯' },
                { value: 'completed', label: '已完成', icon: '✅' },
                { value: 'generating', label: '生成中', icon: '⏳' },
              ].map(filter => (
                <button
                  key={filter.label}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`filter-button ${statusFilter === filter.value ? 'active' : ''}`}
                >
                  <span>{filter.icon}</span>
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="filter-group w-full sm:w-auto">
              <span className="text-gray-500 text-sm font-medium" style={{ marginRight: 'var(--space-4)', minWidth: '48px' }}>排序：</span>
              {[
                { value: 'newest', label: '最新', icon: '🆕' },
                { value: 'oldest', label: '最早', icon: '📅' },
              ].map(sort => (
                <button
                  key={sort.value}
                  onClick={() => setSortBy(sort.value as 'newest' | 'oldest')}
                  className={`filter-button ${sortBy === sort.value ? 'active' : ''}`}
                >
                  <span>{sort.icon}</span>
                  <span>{sort.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project Grid */}
        {sortedProjects.length > 0 ? (
          <div className="project-grid">
            {sortedProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                onView={() => navigate({ to: `/projects/${project.id}` })}
                index={index}
              />
            ))}
          </div>
        ) : (
          /* Empty State - 增加内边距 */
          <div className="empty-state" style={{ paddingTop: 'var(--space-20)', paddingBottom: 'var(--space-20)' }}>
            <div className="empty-state-icon">
              <span className="text-6xl">🎨</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">还没有创作</h3>
            <p className="text-gray-400" style={{ marginBottom: 'var(--space-10)' }}>开始创建你的第一个表情包吧！</p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="magic-button"
            >
              <span className="magic-button-shimmer"></span>
              <span>开始创作</span>
              <span className="magic-sparkle">✨</span>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

interface ProjectCardProps {
  project: Project
  onView: () => void
  index: number
}

function ProjectCard({ project, onView, index }: ProjectCardProps) {
  const statusConfig = {
    completed: { label: '已完成', icon: '✅', gradient: 'from-green-500 to-emerald-600' },
    generating: { label: '生成中', icon: '⏳', gradient: 'from-yellow-500 to-orange-600' },
    failed: { label: '失败', icon: '❌', gradient: 'from-red-500 to-rose-600' },
    partial_failed: { label: '部分失败', icon: '⚠️', gradient: 'from-orange-500 to-amber-600' },
  }

  const config = statusConfig[project.status as keyof typeof statusConfig] || {
    label: project.status,
    icon: '🔄',
    gradient: 'from-gray-500 to-gray-600',
  }

  return (
    <div
      className="project-card animate-scale-in"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={onView}
    >
      {/* Thumbnail Container */}
      <div className="project-thumbnail">
        {project.images[0]?.fileUrl ? (
          <img
            src={project.images[0].fileUrl}
            alt="Project thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="project-placeholder">
            <div className="project-placeholder-icon">
              <span className="text-5xl opacity-50">🎨</span>
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="project-overlay">
          <div className="project-overlay-content">
            <span className="text-white text-lg font-semibold">查看项目</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="project-status">
          <div className={`project-status-badge bg-gradient-to-r ${config.gradient}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="project-info">
        <p className="project-description">
          {project.inputContent}
        </p>
        <div className="project-meta">
          <span className="project-style">
            {project.style?.displayName ? (
              <span className="style-tag-mini">
                {project.style.displayName}
              </span>
            ) : (
              <span className="text-gray-600">默认风格</span>
            )}
          </span>
          <span className="project-date">
            {new Date(project.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </div>
  )
}
