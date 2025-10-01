import type { Logger } from '../logger/type'

export interface DatabaseConfig {
  path: string
  logger: Logger
}

export interface Database {
  // Project operations
  createProject(project: CreateProjectInput): void
  getProject(id: string): Project | null
  getAllProjects(): Project[]
  updateProject(id: string, updates: Partial<Project>): void

  // Image operations
  createImage(image: CreateImageInput): void
  getImage(id: string): Image | null
  updateImage(id: string, updates: Partial<Image>): void
  getImagesByProject(projectId: string): Image[]

  // Style operations
  getStyle(id: string): Style | null
  getActiveStyles(): Style[]

  // Cleanup
  close(): void
}

export interface CreateProjectInput {
  id: string
  userId?: string | null
  inputType: 'text' | 'image' | 'mixed'
  inputContent: string
  styleId?: string | null
  customPrompt?: string | null
  seed: number
  status: 'pending' | 'generating' | 'completed' | 'partial_failed'
}

export interface Project {
  id: string
  userId: string | null
  inputType: 'text' | 'image' | 'mixed'
  inputContent: string
  styleId: string | null
  customPrompt: string | null
  seed: number
  status: 'pending' | 'generating' | 'completed' | 'partial_failed'
  createdAt: number
  updatedAt: number
}

export interface CreateImageInput {
  id: string
  projectId: string
  category: 'emotion' | 'surprise'
  emotionType?: string | null
  surpriseIndex?: number | null
  prompt: string
  seed: number
  filePath: string
  status: 'pending' | 'generating' | 'success' | 'failed'
}

export interface Image {
  id: string
  projectId: string
  category: 'emotion' | 'surprise'
  emotionType: string | null
  surpriseIndex: number | null
  prompt: string
  seed: number
  filePath: string
  status: 'pending' | 'generating' | 'success' | 'failed'
  errorMessage: string | null
  retryCount: number
  width: number | null
  height: number | null
  modelMetadata: string | null
  createdAt: number
  updatedAt: number
}

export interface Style {
  id: string
  displayName: string
  description: string
  promptTemplate: string
  thumbnailUrl: string | null
  sortOrder: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}
