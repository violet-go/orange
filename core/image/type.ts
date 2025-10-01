export interface ImageGen {
  generate(params: ImageGenParams): Promise<ImageGenResult>
}

export interface ImageGenParams {
  prompt: string
  seed?: number
  width?: number
  height?: number
}

export interface ImageGenResult {
  imageBuffer: Buffer
  width: number
  height: number
  metadata?: Record<string, any>
}
