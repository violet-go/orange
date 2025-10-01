import type { ImageGen, ImageGenParams, ImageGenResult } from './type'
import type { Logger } from '../../base/logger/type'

// ==================== Mock ImageGen ====================

export interface MockImageGenConfig {
  delay?: number // milliseconds to simulate API latency
  failRate?: number // 0.0 to 1.0, probability of failure
  width?: number
  height?: number
}

export function createMockImageGen(config: MockImageGenConfig = {}): ImageGen {
  const {
    delay = 0,
    failRate = 0,
    width = 512,
    height = 512
  } = config

  return {
    async generate(params: ImageGenParams): Promise<ImageGenResult> {
      // Simulate delay if configured
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Simulate random failure if configured
      if (failRate > 0 && Math.random() < failRate) {
        throw new Error('Mock generation failed (simulated failure)')
      }

      // Generate fake PNG-like buffer
      const timestamp = Date.now()
      const seed = params.seed || Math.floor(Math.random() * 1000000)
      const fakeImageBuffer = Buffer.from(`PNG_FAKE_DATA_${timestamp}_${seed}_${params.prompt.slice(0, 20)}`)

      return {
        imageBuffer: fakeImageBuffer,
        width: params.width || width,
        height: params.height || height,
        metadata: {
          modelVersion: 'mock-v1.0',
          seed,
          executionTime: delay
        }
      }
    }
  }
}

// ==================== Real ImageGen (Google Nano Banana API) ====================

export interface RealImageGenConfig {
  apiKey: string
  baseUrl: string
  logger: Logger
}

export function createRealImageGen(config: RealImageGenConfig): ImageGen {
  const { apiKey, baseUrl, logger } = config

  return {
    async generate(params: ImageGenParams): Promise<ImageGenResult> {
      const seed = params.seed || Math.floor(Math.random() * 1000000)
      const width = params.width || 512
      const height = params.height || 512

      logger.debug('Calling Google Nano Banana API', {
        prompt: params.prompt,
        seed,
        width,
        height
      })

      try {
        // Step 1: Call Google Nano Banana API
        const response = await fetch(`${baseUrl}/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: params.prompt,
            seed,
            width,
            height
          })
        })

        // Step 2: Error handling
        if (!response.ok) {
          const errorText = await response.text()
          logger.error('API request failed', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          })
          throw new Error(`API error: ${response.status} - ${response.statusText}`)
        }

        // Step 3: Parse response
        const data = await response.json()
        logger.debug('API response received', { data })

        // Step 4: Download image
        const imageResponse = await fetch(data.imageUrl)
        if (!imageResponse.ok) {
          logger.error('Image download failed', {
            status: imageResponse.status,
            imageUrl: data.imageUrl
          })
          throw new Error(`Image download failed: ${imageResponse.status}`)
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

        logger.info('Image generated successfully', {
          prompt: params.prompt,
          seed,
          bufferSize: imageBuffer.length
        })

        return {
          imageBuffer,
          width: data.width || width,
          height: data.height || height,
          metadata: {
            modelVersion: data.version || 'unknown',
            seed,
            apiProvider: 'google-nano-banana'
          }
        }
      } catch (error) {
        logger.error('Image generation failed', error as Error)
        throw error
      }
    }
  }
}
