import { test, expect } from 'bun:test'
import { createRealImageGen } from '../../core/image/proc'
import { createLogger } from '../../base/logger/proc'

/**
 * Phase 4 - Gemini API Format Verification Test
 *
 * This test verifies that our implementation correctly formats
 * requests and parses responses according to Gemini API spec.
 */

test('Gemini API request format is correct', async () => {
  const logger = createLogger({ level: 'error' })

  // Mock fetch to capture request
  let capturedRequest: any = null
  const originalFetch = global.fetch

  global.fetch = async (url: any, options: any) => {
    capturedRequest = {
      url: url.toString(),
      headers: options.headers,
      body: JSON.parse(options.body)
    }

    // Return mock Gemini response
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            }
          }]
        }
      }]
    }), { status: 200 })
  }

  try {
    const imageGen = createRealImageGen({
      apiKey: 'test-api-key',
      baseUrl: 'https://generativelanguage.googleapis.com',
      logger
    })

    await imageGen.generate({
      prompt: 'a cute cat',
      seed: 12345
    })

    // Verify request format
    expect(capturedRequest).toBeTruthy()

    // ✓ Correct endpoint
    expect(capturedRequest.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent'
    )

    // ✓ Correct headers
    expect(capturedRequest.headers['x-goog-api-key']).toBe('test-api-key')
    expect(capturedRequest.headers['Content-Type']).toBe('application/json')

    // ✓ Correct request body structure
    expect(capturedRequest.body).toHaveProperty('contents')
    expect(Array.isArray(capturedRequest.body.contents)).toBe(true)
    expect(capturedRequest.body.contents[0]).toHaveProperty('parts')
    expect(capturedRequest.body.contents[0].parts[0]).toEqual({ text: 'a cute cat' })

  } finally {
    global.fetch = originalFetch
  }
})

test('Gemini API response parsing is correct', async () => {
  const logger = createLogger({ level: 'error' })

  // Mock fetch with realistic Gemini response
  const originalFetch = global.fetch
  global.fetch = async () => {
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              // 1x1 transparent PNG in base64
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            }
          }]
        }
      }]
    }), { status: 200 })
  }

  try {
    const imageGen = createRealImageGen({
      apiKey: 'test-api-key',
      baseUrl: 'https://generativelanguage.googleapis.com',
      logger
    })

    const result = await imageGen.generate({
      prompt: 'test prompt',
      seed: 12345
    })

    // ✓ Returns valid Buffer
    expect(result.imageBuffer).toBeInstanceOf(Buffer)
    expect(result.imageBuffer.length).toBeGreaterThan(0)

    // ✓ Buffer is valid PNG (magic number check)
    expect(result.imageBuffer[0]).toBe(0x89)
    expect(result.imageBuffer[1]).toBe(0x50) // 'P'
    expect(result.imageBuffer[2]).toBe(0x4E) // 'N'
    expect(result.imageBuffer[3]).toBe(0x47) // 'G'

    // ✓ Metadata is correct
    expect(result.metadata?.modelVersion).toBe('gemini-2.5-flash-image-preview')
    expect(result.metadata?.apiProvider).toBe('google-gemini')
    expect(result.metadata?.mimeType).toBe('image/png')

  } finally {
    global.fetch = originalFetch
  }
})

test('Gemini API error handling', async () => {
  const logger = createLogger({ level: 'error' })

  const originalFetch = global.fetch

  // Test 1: API returns error status
  global.fetch = async () => {
    return new Response('API quota exceeded', { status: 429 })
  }

  try {
    const imageGen = createRealImageGen({
      apiKey: 'test-api-key',
      baseUrl: 'https://generativelanguage.googleapis.com',
      logger
    })

    await expect(imageGen.generate({ prompt: 'test' })).rejects.toThrow(/429/)
  } finally {
    global.fetch = originalFetch
  }

  // Test 2: Response missing candidates
  global.fetch = async () => {
    return new Response(JSON.stringify({ candidates: [] }), { status: 200 })
  }

  try {
    const imageGen = createRealImageGen({
      apiKey: 'test-api-key',
      baseUrl: 'https://generativelanguage.googleapis.com',
      logger
    })

    await expect(imageGen.generate({ prompt: 'test' })).rejects.toThrow(/empty candidates/)
  } finally {
    global.fetch = originalFetch
  }

  // Test 3: Response missing inlineData
  global.fetch = async () => {
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{ text: 'Only text, no image' }]
        }
      }]
    }), { status: 200 })
  }

  try {
    const imageGen = createRealImageGen({
      apiKey: 'test-api-key',
      baseUrl: 'https://generativelanguage.googleapis.com',
      logger
    })

    await expect(imageGen.generate({ prompt: 'test' })).rejects.toThrow(/No image data/)
  } finally {
    global.fetch = originalFetch
  }
})
