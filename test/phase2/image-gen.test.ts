import { test, expect } from 'bun:test'
import { createMockImageGen } from '../../core/image/proc'

test('Mock ImageGen returns valid format', async () => {
  const mockGen = createMockImageGen()

  const result = await mockGen.generate({
    prompt: 'test prompt',
    seed: 12345
  })

  // ✓ Should return Buffer
  expect(result.imageBuffer).toBeInstanceOf(Buffer)
  expect(result.imageBuffer.length).toBeGreaterThan(0)

  // ✓ Should have dimensions
  expect(result.width).toBe(512)
  expect(result.height).toBe(512)

  // ✓ Should have metadata
  expect(result.metadata).toBeDefined()
  expect(result.metadata?.seed).toBe(12345)
})

test('Mock ImageGen simulates delay', async () => {
  const slowGen = createMockImageGen({ delay: 100 })

  const start = Date.now()
  await slowGen.generate({ prompt: 'test' })
  const elapsed = Date.now() - start

  // ✓ Should take at least the configured delay (allow 1ms tolerance for timing)
  expect(elapsed).toBeGreaterThanOrEqual(99)
})

test('Mock ImageGen simulates failure', async () => {
  const failGen = createMockImageGen({ failRate: 1.0 })

  // ✓ Should throw error when failRate is 1.0
  await expect(
    failGen.generate({ prompt: 'test' })
  ).rejects.toThrow('Mock generation failed')
})

test('Mock ImageGen simulates partial failure', async () => {
  const flakyGen = createMockImageGen({ failRate: 0.5 })

  let successCount = 0
  let failureCount = 0

  // Run 20 attempts to get statistically meaningful result
  for (let i = 0; i < 20; i++) {
    try {
      await flakyGen.generate({ prompt: 'test' })
      successCount++
    } catch {
      failureCount++
    }
  }

  // ✓ Should have both successes and failures
  // With 0.5 fail rate and 20 attempts, expect roughly 50/50 split
  // Allow range from 20% to 80% to account for randomness
  expect(failureCount).toBeGreaterThan(4) // at least 20%
  expect(failureCount).toBeLessThan(16)   // at most 80%
  expect(successCount).toBeGreaterThan(4) // at least 20%
})
