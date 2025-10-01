import { describe, test, expect } from 'bun:test'
import { createPubSub } from '../../base/pubsub/proc'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('PubSub', () => {
  test('能订阅和接收消息', async () => {
    const pubsub = createPubSub()
    const messageArray: any[] = []

    // Start subscription
    const subscription = pubsub.subscribe('test-channel')

    // Collect messages in background
    ;(async () => {
      for await (const msg of subscription) {
        messageArray.push(msg)
        if (messageArray.length >= 3) break
      }
    })()

    // Wait a bit for subscription to be ready
    await sleep(10)

    // Publish messages
    await pubsub.publish('test-channel', { data: 'message-1' })
    await pubsub.publish('test-channel', { data: 'message-2' })
    await pubsub.publish('test-channel', { data: 'message-3' })

    // Wait for messages to be received
    await sleep(100)

    expect(messageArray.length).toBe(3)
    expect(messageArray[0].data).toBe('message-1')
    expect(messageArray[2].data).toBe('message-3')
  })

  test('多个订阅者都能收到', async () => {
    const pubsub = createPubSub()
    const messageArray1: any[] = []
    const messageArray2: any[] = []

    // Start first subscription
    const subscription1 = pubsub.subscribe('test-channel')
    ;(async () => {
      for await (const msg of subscription1) {
        messageArray1.push(msg)
        if (messageArray1.length >= 1) break
      }
    })()

    // Start second subscription
    const subscription2 = pubsub.subscribe('test-channel')
    ;(async () => {
      for await (const msg of subscription2) {
        messageArray2.push(msg)
        if (messageArray2.length >= 1) break
      }
    })()

    // Wait for subscriptions to be ready
    await sleep(10)

    // Publish message
    await pubsub.publish('test-channel', { data: 'broadcast' })

    // Wait for messages to be received
    await sleep(100)

    expect(messageArray1.length).toBe(1)
    expect(messageArray1[0].data).toBe('broadcast')
    expect(messageArray2.length).toBe(1)
    expect(messageArray2[0].data).toBe('broadcast')
  })
})
