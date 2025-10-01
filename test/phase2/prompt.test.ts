import { test, expect } from 'bun:test'
import { createPromptBuilder } from '../../core/prompt/proc'

test('PromptBuilder builds single emotion prompt correctly', () => {
  const builder = createPromptBuilder()

  const happyPrompt = builder.buildEmotion({
    basePrompt: 'a cute cat girl',
    emotionType: 'happy'
  })

  expect(happyPrompt).toContain('a cute cat girl')
  expect(happyPrompt).toContain('happy expression')
  expect(happyPrompt).toContain('bright eyes')
})

test('PromptBuilder generates all 9 emotions', () => {
  const builder = createPromptBuilder()

  const promptArray = builder.buildAllEmotions('a cute cat girl')

  // ✓ Should have 9 prompts
  expect(promptArray.length).toBe(9)

  // ✓ Should include all emotion types
  const emotionTypeArray = promptArray.map(p => p.emotionType)
  expect(emotionTypeArray).toContain('happy')
  expect(emotionTypeArray).toContain('sad')
  expect(emotionTypeArray).toContain('angry')
  expect(emotionTypeArray).toContain('surprised')
  expect(emotionTypeArray).toContain('thinking')
  expect(emotionTypeArray).toContain('shy')
  expect(emotionTypeArray).toContain('proud')
  expect(emotionTypeArray).toContain('tired')
  expect(emotionTypeArray).toContain('love')

  // ✓ Every prompt should contain base content
  expect(promptArray.every(p => p.prompt.includes('a cute cat girl'))).toBe(true)
})

test('PromptBuilder output order is stable', () => {
  const builder = createPromptBuilder()

  const prompts1 = builder.buildAllEmotions('a cute cat girl')
  const prompts2 = builder.buildAllEmotions('a cute cat girl')

  // ✓ Same input should produce same order
  const emotionOrder1 = prompts1.map(p => p.emotionType)
  const emotionOrder2 = prompts2.map(p => p.emotionType)

  expect(emotionOrder1).toEqual(emotionOrder2)
})
