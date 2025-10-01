import type { PromptBuilder, EmotionType, EmotionPrompt, SurprisePrompt } from './type'
import emotionsData from './lib/emotions.json'

export function createPromptBuilder(): PromptBuilder {
  const emotionTemplateMap = emotionsData as Record<EmotionType, string>

  // 7 random surprise scenarios
  const surpriseTemplateArray = [
    'eating delicious food, enjoying the taste',
    'playing video games, focused and excited',
    'sleeping peacefully, dreaming sweetly',
    'exercising energetically, full of vitality',
    'studying or reading, concentrating deeply',
    'listening to music, immersed in melody',
    'dancing freely, expressing joy through movement'
  ]

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
    },

    buildSurprise({ basePrompt, surpriseIndex }) {
      if (surpriseIndex < 0 || surpriseIndex >= surpriseTemplateArray.length) {
        throw new Error(`Invalid surprise index: ${surpriseIndex}`)
      }
      const template = surpriseTemplateArray[surpriseIndex]
      return `${basePrompt}, ${template}`
    },

    buildAllSurprises(basePrompt) {
      return surpriseTemplateArray.map((_, index) => ({
        surpriseIndex: index,
        prompt: this.buildSurprise({ basePrompt, surpriseIndex: index })
      }))
    }
  }
}
