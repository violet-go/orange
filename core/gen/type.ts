export interface GenService {
  generate(params: GenerateParams): Promise<string> // Returns projectId
}

export interface GenerateParams {
  inputType: 'text' | 'image' | 'mixed'
  inputContent: string
  styleId?: string
  customPrompt?: string
  seed?: number
}
