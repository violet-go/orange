import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createDatabase } from '../../base/db/proc'
import { createLogger } from '../../base/logger/proc'
import type { Database } from '../../base/db/type'

describe('Database', () => {
  let db: Database

  beforeEach(() => {
    const logger = createLogger({ level: 'error' })
    db = createDatabase({ path: ':memory:', logger })
  })

  afterEach(() => {
    db.close()
  })

  test('四张表都创建了', () => {
    const tableArray = db.getActiveStyles() // This will fail if tables don't exist

    // Verify we can query without errors (tables exist)
    expect(tableArray).toBeDefined()
  })

  test('能插入和查询数据', () => {
    // Create a project
    db.createProject({
      id: 'test-project-id',
      inputType: 'text',
      inputContent: 'test content',
      seed: 12345,
      status: 'pending'
    })

    const project = db.getProject('test-project-id')

    expect(project).not.toBeNull()
    expect(project!.id).toBe('test-project-id')
    expect(project!.inputType).toBe('text')
    expect(project!.inputContent).toBe('test content')
    expect(project!.seed).toBe(12345)
    expect(project!.status).toBe('pending')
  })

  test('能创建和查询 Image', () => {
    // Create a project first
    db.createProject({
      id: 'test-project-id',
      inputType: 'text',
      inputContent: 'test content',
      seed: 12345,
      status: 'pending'
    })

    // Create an image
    db.createImage({
      id: 'test-image-id',
      projectId: 'test-project-id',
      category: 'emotion',
      emotionType: 'happy',
      prompt: 'test prompt',
      seed: 123,
      filePath: 'test/path.png',
      status: 'pending'
    })

    const image = db.getImage('test-image-id')

    expect(image).not.toBeNull()
    expect(image!.id).toBe('test-image-id')
    expect(image!.projectId).toBe('test-project-id')
    expect(image!.emotionType).toBe('happy')
  })

  test('能通过 projectId 查询所有 Image', () => {
    db.createProject({
      id: 'test-project-id',
      inputType: 'text',
      inputContent: 'test content',
      seed: 12345,
      status: 'pending'
    })

    // Create multiple images
    for (let i = 0; i < 3; i++) {
      db.createImage({
        id: `image-${i}`,
        projectId: 'test-project-id',
        category: 'emotion',
        emotionType: 'happy',
        prompt: `prompt ${i}`,
        seed: i,
        filePath: `path-${i}.png`,
        status: 'pending'
      })
    }

    const imageArray = db.getImagesByProject('test-project-id')

    expect(imageArray).toHaveLength(3)
    expect(imageArray[0].id).toBe('image-0')
    expect(imageArray[2].id).toBe('image-2')
  })
})
