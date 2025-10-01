import type { PromptBuilder, EmotionType, EmotionPrompt } from './type'
import emotionsData from './lib/emotions.json'

export function createPromptBuilder(): PromptBuilder {
  const emotionTemplateMap = emotionsData as Record<EmotionType, string>

  return {
    buildEmotion({ basePrompt, emotionType }) {
      const template = emotionTemplateMap[emotionType]
      if (!template) {
        throw new Error(`Unknown emotion type: ${emotionType}`)
      }
      return `${basePrompt}, ${template}`
    },

    buildAllEmotions(basePrompt) {
      const emotionTypeArray: EmotionType[] = [
        'happy',
        'sad',
        'angry',
        'surprised',
        'thinking',
        'shy',
        'proud',
        'tired',
        'love'
      ]

      return emotionTypeArray.map(emotionType => ({
        emotionType,
        prompt: this.buildEmotion({ basePrompt, emotionType })
      }))
    }
  }
}
