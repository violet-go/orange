import type { ImageGen, ImageGenParams, ImageGenResult } from './type'

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
