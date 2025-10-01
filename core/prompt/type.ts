export interface PromptBuilder {
  buildEmotion(params: {
    basePrompt: string
    emotionType: EmotionType
  }): string

  buildAllEmotions(basePrompt: string): EmotionPrompt[]

  buildSurprise(params: {
    basePrompt: string
    surpriseIndex: number
  }): string

  buildAllSurprises(basePrompt: string): SurprisePrompt[]
}

export type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thinking'
  | 'shy'
  | 'proud'
  | 'tired'
  | 'love'

export interface EmotionPrompt {
  emotionType: EmotionType
  prompt: string
}

export interface SurprisePrompt {
  surpriseIndex: number
  prompt: string
}
