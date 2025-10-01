import { test, expect } from 'bun:test'
import { createGenService } from '../../core/gen/proc'
import { createDatabase } from '../../base/db/proc'
import { createStorage } from '../../base/storage/proc'
import { createPromptBuilder } from '../../core/prompt/proc'
import { createPubSub } from '../../base/pubsub/proc'
import { createLogger } from '../../base/logger/proc'
import { rmSync } from 'node:fs'
import type { ImageGen, ImageGenParams, ImageGenResult } from '../../core/image/type'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test('GenService retries failed images with different seed', async () => {
  const logger = createLogger({ level: 'error' })
  const db = createDatabase({ path: ':memory:', logger })
  const storage = createStorage({ basePath: './test-data-retry' })
  const promptBuilder = createPromptBuilder()
  const pubsub = createPubSub()

  // Create a mock that fails first 3 attempts, then succeeds
  let attemptCount = 0
  const flakyImageGen: ImageGen = {
    async generate(params: ImageGenParams): Promise<ImageGenResult> {
      attemptCount++

      // First 3 calls fail
      if (attemptCount <= 3) {
        throw new Error('Simulated failure')
      }

      // Subsequent calls succeed
      return {
        imageBuffer: Buffer.from(`PNG_SUCCESS_${Date.now()}`),
        width: 512,
        height: 512,
        metadata: { seed: params.seed }
      }
    }
  }

  const genService = createGenService({
    db,
    storage,
    imageGen: flakyImageGen,
    promptBuilder,
    pubsub,
    logger
  })

  const projectId = await genService.generate({
    inputType: 'text',
    inputContent: 'test'
  })

  // Wait for generation with retries
  await sleep(800)

  const imageArray = db.getImagesByProject(projectId)

  // ✓ Some images should have retried
  const retriedImageArray = imageArray.filter(img => img.retryCount > 0)
  expect(retriedImageArray.length).toBeGreaterThan(0)
  expect(retriedImageArray.length).toBeLessThanOrEqual(3)

  // ✓ Project should reach final status (completed or partial_failed)
  const project = db.getProject(projectId)
  expect(['completed', 'partial_failed']).toContain(project?.status)

  db.close()
  rmSync('./test-data-retry', { recursive: true, force: true })
})

test('Retry logic uses different seed', async () => {
  const logger = createLogger({ level: 'error' })
  const db = createDatabase({ path: ':memory:', logger })
  const storage = createStorage({ basePath: './test-data-retry2' })
  const promptBuilder = createPromptBuilder()
  const pubsub = createPubSub()

  const capturedSeedArray: number[] = []

  // Mock that captures seeds and fails first attempt
  let callCount = 0
  const seedCapturingGen: ImageGen = {
    async generate(params: ImageGenParams): Promise<ImageGenResult> {
      callCount++
      capturedSeedArray.push(params.seed || 0)

      // Fail first call to trigger retry
      if (callCount === 1) {
        throw new Error('First attempt fails')
      }

      return {
        imageBuffer: Buffer.from(`PNG_${params.seed}`),
        width: 512,
        height: 512,
        metadata: { seed: params.seed }
      }
    }
  }

  const genService = createGenService({
    db,
    storage,
    imageGen: seedCapturingGen,
    promptBuilder,
    pubsub,
    logger
  })

  const projectId = await genService.generate({
    inputType: 'text',
    inputContent: 'test',
    seed: 12345
  })

  await sleep(500)

  // ✓ Should have retried the first failed image
  // We generate 16 images (9 emotions + 7 surprises):
  // Emotions: 12345, 12346, ..., 12353
  // Surprises: 14345, 14346, ..., 14351
  // First one (12345) fails and retries with 12345+1000 = 13345
  // So we should have: 12345 (fail), then 15 success + 1 retry = 17 total
  expect(capturedSeedArray.length).toBe(17) // 16 original + 1 retry
  expect(capturedSeedArray[0]).toBe(12345) // First attempt
  expect(capturedSeedArray[16]).toBe(12345 + 1000) // Retry with +1000

  db.close()
  rmSync('./test-data-retry2', { recursive: true, force: true })
})
