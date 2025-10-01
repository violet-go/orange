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

      logger.debug('Calling Gemini 2.5 Flash Image Preview API', {
        prompt: params.prompt,
        seed,
        width,
        height
      })

      try {
        // Step 1: Call Gemini API
        // Endpoint: /v1beta/models/gemini-2.5-flash-image-preview:generateContent
        const response = await fetch(`${baseUrl}/v1beta/models/gemini-2.5-flash-image-preview:generateContent`, {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: params.prompt }
              ]
            }]
          }),
          // Disable TLS certificate verification for relay API
          // @ts-ignore - Bun-specific fetch option
          tls: {
            rejectUnauthorized: false
          }
        })

        // Step 2: Error handling
        if (!response.ok) {
          const errorText = await response.text()
          logger.error('Gemini API request failed', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          })
          throw new Error(`Gemini API error: ${response.status} - ${response.statusText}`)
        }

        // Step 3: Parse response
        const data = await response.json()
        logger.debug('Gemini API response received', {
          hasCandidates: !!data.candidates,
          candidatesCount: data.candidates?.length
        })

        // Step 4: Extract base64 image data
        if (!data.candidates || data.candidates.length === 0) {
          logger.error('No candidates in response', { data })
          throw new Error('No image generated - empty candidates array')
        }

        const candidate = data.candidates[0]
        if (!candidate.content || !candidate.content.parts) {
          logger.error('Invalid candidate structure', { candidate })
          throw new Error('Invalid response structure - missing content.parts')
        }

        // Find the part with inlineData
        const imagePart = candidate.content.parts.find((part: any) => part.inlineData)
        if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
          logger.error('No inlineData found in response', { parts: candidate.content.parts })
          throw new Error('No image data in response')
        }

        // Step 5: Decode base64 to Buffer
        const base64Data = imagePart.inlineData.data
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const mimeType = imagePart.inlineData.mimeType || 'image/png'

        logger.info('Image generated successfully', {
          prompt: params.prompt,
          seed,
          bufferSize: imageBuffer.length,
          mimeType
        })

        return {
          imageBuffer,
          width: width,  // Gemini doesn't return dimensions, use requested
          height: height,
          metadata: {
            modelVersion: 'gemini-2.5-flash-image-preview',
            seed,
            apiProvider: 'google-gemini',
            mimeType
          }
        }
      } catch (error) {
        logger.error('Image generation failed', error as Error)
        throw error
      }
    }
  }
}
