import { test, expect } from 'bun:test'
import { createGenService } from '../../core/gen/proc'
import { createDatabase } from '../../base/db/proc'
import { createStorage } from '../../base/storage/proc'
import { createMockImageGen } from '../../core/image/proc'
import { createPromptBuilder } from '../../core/prompt/proc'
import { createPubSub } from '../../base/pubsub/proc'
import { createLogger } from '../../base/logger/proc'
import { rmSync } from 'node:fs'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test('GenService returns projectId immediately', async () => {
  const logger = createLogger({ level: 'error' })
  const db = createDatabase({ path: ':memory:', logger })
  const storage = createStorage({ basePath: './test-data-gen' })
  const mockImageGen = createMockImageGen({ delay: 50 })
  const promptBuilder = createPromptBuilder()
  const pubsub = createPubSub()

  const genService = createGenService({
    db,
    storage,
    imageGen: mockImageGen,
    promptBuilder,
    pubsub,
    logger
  })

  const start = Date.now()
  const projectId = await genService.generate({
    inputType: 'text',
    inputContent: 'a cute cat girl'
  })
  const elapsed = Date.now() - start

  // ✓ Should return projectId immediately (< 100ms)
  expect(typeof projectId).toBe('string')
  expect(elapsed).toBeLessThan(100)

  // Wait for background generation to finish before cleanup
  await sleep(600)

  db.close()
  rmSync('./test-data-gen', { recursive: true, force: true })
})

test('GenService creates Project and 16 Image records (9 emotions + 7 surprises)', async () => {
  const logger = createLogger({ level: 'error' })
  const db = createDatabase({ path: ':memory:', logger })
  const storage = createStorage({ basePath: './test-data-gen2' })
  const mockImageGen = createMockImageGen({ delay: 50 })
  const promptBuilder = createPromptBuilder()
  const pubsub = createPubSub()

  const genService = createGenService({
    db,
    storage,
    imageGen: mockImageGen,
    promptBuilder,
    pubsub,
    logger
  })

  const projectId = await genService.generate({
    inputType: 'text',
    inputContent: 'a cute cat girl'
  })

  // ✓ Database should have Project record
  const project = db.getProject(projectId)
  expect(project).not.toBeNull()
  expect(project?.id).toBe(projectId)
  expect(project?.inputType).toBe('text')
  expect(project?.inputContent).toBe('a cute cat girl')
  expect(['pending', 'generating']).toContain(project?.status)

  // ✓ Database should have 16 Image records (9 emotions + 7 surprises)
  const imageArray = db.getImagesByProject(projectId)
  expect(imageArray.length).toBe(16)

  // ✓ Verify 9 emotion images
  const emotionImageArray = imageArray.filter(img => img.category === 'emotion')
  expect(emotionImageArray.length).toBe(9)
  const emotionTypeArray = emotionImageArray.map(img => img.emotionType).sort()
  expect(emotionTypeArray).toEqual([
    'angry', 'happy', 'love', 'proud', 'sad', 'shy', 'surprised', 'thinking', 'tired'
  ])

  // ✓ Verify 7 surprise images
  const surpriseImageArray = imageArray.filter(img => img.category === 'surprise')
  expect(surpriseImageArray.length).toBe(7)
  const surpriseIndexArray = surpriseImageArray.map(img => img.surpriseIndex).sort()
  expect(surpriseIndexArray).toEqual([0, 1, 2, 3, 4, 5, 6])

  // Wait for background generation to finish before cleanup
  await sleep(800)

  db.close()
  rmSync('./test-data-gen2', { recursive: true, force: true })
})

test('GenService completes async generation', async () => {
  const logger = createLogger({ level: 'error' })
  const db = createDatabase({ path: ':memory:', logger })
  const storage = createStorage({ basePath: './test-data-gen3' })
  const mockImageGen = createMockImageGen({ delay: 20 }) // Fast for testing
  const promptBuilder = createPromptBuilder()
  const pubsub = createPubSub()

  const genService = createGenService({
    db,
    storage,
    imageGen: mockImageGen,
    promptBuilder,
    pubsub,
    logger
  })

  const projectId = await genService.generate({
    inputType: 'text',
    inputContent: 'a cute cat girl'
  })

  // Wait for async generation to complete (9 * 20ms + buffer)
  await sleep(500)

  // ✓ Project status should be completed
  const updatedProject = db.getProject(projectId)
  expect(updatedProject?.status).toBe('completed')

  // ✓ All images should be success
  const updatedImageArray = db.getImagesByProject(projectId)
  expect(updatedImageArray.every(img => img.status === 'success')).toBe(true)

  // ✓ Files should exist in storage
  for (const img of updatedImageArray) {
    const exists = await storage.exists(img.filePath.replace('data/', ''))
    expect(exists).toBe(true)
  }

  db.close()
  rmSync('./test-data-gen3', { recursive: true, force: true })
})
