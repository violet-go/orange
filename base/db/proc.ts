import { Database as BunDatabase } from 'bun:sqlite'
import { readFileSync } from 'fs'
import type { Database, DatabaseConfig, CreateProjectInput, CreateImageInput, Project, Image, Style } from './type'

export function createDatabase(config: DatabaseConfig): Database {
  const db = new BunDatabase(config.path)
  const logger = config.logger.child('db')

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON')

  // Initialize schema
  const schema = readFileSync('base/db/schema.sql', 'utf-8')
  db.run(schema)

  logger.info('Database initialized', { path: config.path })

  return {
    createProject(project: CreateProjectInput): void {
      const now = Date.now()

      db.run(`
        INSERT INTO projects (
          id, user_id, input_type, input_content,
          style_id, custom_prompt, seed, status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        project.id,
        project.userId || null,
        project.inputType,
        project.inputContent,
        project.styleId || null,
        project.customPrompt || null,
        project.seed,
        project.status,
        now,
        now
      ])

      logger.debug('Project created', { projectId: project.id })
    },

    getProject(id: string): Project | null {
      const row = db.query(`
        SELECT * FROM projects WHERE id = ?
      `).get(id) as any

      if (!row) return null

      return {
        id: row.id,
        userId: row.user_id,
        inputType: row.input_type,
        inputContent: row.input_content,
        styleId: row.style_id,
        customPrompt: row.custom_prompt,
        seed: row.seed,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    },

    updateProject(id: string, updates: Partial<Project>): void {
      const setArray: string[] = []
      const valueArray: any[] = []

      if (updates.status !== undefined) {
        setArray.push('status = ?')
        valueArray.push(updates.status)
      }

      if (setArray.length === 0) return

      setArray.push('updated_at = ?')
      valueArray.push(Date.now())
      valueArray.push(id)

      db.run(`
        UPDATE projects SET ${setArray.join(', ')} WHERE id = ?
      `, valueArray)

      logger.debug('Project updated', { projectId: id })
    },

    createImage(image: CreateImageInput): void {
      const now = Date.now()

      db.run(`
        INSERT INTO images (
          id, project_id, category, emotion_type, surprise_index,
          prompt, seed, file_path, status, retry_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        image.id,
        image.projectId,
        image.category,
        image.emotionType || null,
        image.surpriseIndex !== undefined ? image.surpriseIndex : null,
        image.prompt,
        image.seed,
        image.filePath,
        image.status,
        0,
        now,
        now
      ])

      logger.debug('Image created', { imageId: image.id })
    },

    getImage(id: string): Image | null {
      const row = db.query(`
        SELECT * FROM images WHERE id = ?
      `).get(id) as any

      if (!row) return null

      return {
        id: row.id,
        projectId: row.project_id,
        category: row.category,
        emotionType: row.emotion_type,
        surpriseIndex: row.surprise_index,
        prompt: row.prompt,
        seed: row.seed,
        filePath: row.file_path,
        status: row.status,
        errorMessage: row.error_message,
        retryCount: row.retry_count,
        width: row.width,
        height: row.height,
        modelMetadata: row.model_metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    },

    updateImage(id: string, updates: Partial<Image>): void {
      const setArray: string[] = []
      const valueArray: any[] = []

      if (updates.status !== undefined) {
        setArray.push('status = ?')
        valueArray.push(updates.status)
      }
      if (updates.width !== undefined) {
        setArray.push('width = ?')
        valueArray.push(updates.width)
      }
      if (updates.height !== undefined) {
        setArray.push('height = ?')
        valueArray.push(updates.height)
      }
      if (updates.modelMetadata !== undefined) {
        setArray.push('model_metadata = ?')
        valueArray.push(updates.modelMetadata)
      }
      if (updates.errorMessage !== undefined) {
        setArray.push('error_message = ?')
        valueArray.push(updates.errorMessage)
      }
      if (updates.retryCount !== undefined) {
        setArray.push('retry_count = ?')
        valueArray.push(updates.retryCount)
      }

      if (setArray.length === 0) return

      setArray.push('updated_at = ?')
      valueArray.push(Date.now())
      valueArray.push(id)

      db.run(`
        UPDATE images SET ${setArray.join(', ')} WHERE id = ?
      `, valueArray)

      logger.debug('Image updated', { imageId: id })
    },

    getImagesByProject(projectId: string): Image[] {
      const rowArray = db.query(`
        SELECT * FROM images WHERE project_id = ? ORDER BY created_at ASC
      `).all(projectId) as any[]

      return rowArray.map(row => ({
        id: row.id,
        projectId: row.project_id,
        category: row.category,
        emotionType: row.emotion_type,
        surpriseIndex: row.surprise_index,
        prompt: row.prompt,
        seed: row.seed,
        filePath: row.file_path,
        status: row.status,
        errorMessage: row.error_message,
        retryCount: row.retry_count,
        width: row.width,
        height: row.height,
        modelMetadata: row.model_metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    },

    getStyle(id: string): Style | null {
      const row = db.query(`
        SELECT * FROM styles WHERE id = ?
      `).get(id) as any

      if (!row) return null

      return {
        id: row.id,
        displayName: row.display_name,
        description: row.description,
        promptTemplate: row.prompt_template,
        thumbnailUrl: row.thumbnail_url,
        sortOrder: row.sort_order,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    },

    getActiveStyles(): Style[] {
      const rowArray = db.query(`
        SELECT * FROM styles WHERE is_active = 1 ORDER BY sort_order ASC
      `).all() as any[]

      return rowArray.map(row => ({
        id: row.id,
        displayName: row.display_name,
        description: row.description,
        promptTemplate: row.prompt_template,
        thumbnailUrl: row.thumbnail_url,
        sortOrder: row.sort_order,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    },

    close(): void {
      db.close()
      logger.info('Database closed')
    },
  }
}
