export interface ImageGen {
  generate(params: ImageGenParams): Promise<ImageGenResult>
}

export interface ImageGenParams {
  prompt: string
  seed?: number
  width?: number
  height?: number
  /**
   * Optional: Base64-encoded input image for image-to-image generation
   * Format: { mimeType: 'image/png' | 'image/jpeg', base64Data: 'base64string' }
   */
  inputImage?: {
    mimeType: string
    base64Data: string
  }
}

export interface ImageGenResult {
  imageBuffer: Buffer
  width: number
  height: number
  metadata?: Record<string, any>
}
