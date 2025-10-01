export interface PromptBuilder {
  buildEmotion(params: {
    basePrompt: string
    emotionType: EmotionType
  }): string

  buildAllEmotions(basePrompt: string): EmotionPrompt[]
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
