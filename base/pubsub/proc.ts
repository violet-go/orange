import type { PubSub } from './type'

export function createPubSub(): PubSub {
  const channelMap = new Map<string, Set<(message: any) => void>>()

  return {
    async publish(channel: string, message: any): Promise<void> {
      const subscriberSet = channelMap.get(channel)
      if (subscriberSet) {
        for (const callback of subscriberSet) {
          callback(message)
        }
      }
    },

    async *subscribe(channel: string): AsyncIterator<any> {
      const queue: any[] = []
      let resolve: ((value: IteratorResult<any>) => void) | null = null

      const callback = (message: any) => {
        if (resolve) {
          resolve({ value: message, done: false })
          resolve = null
        } else {
          queue.push(message)
        }
      }

      // Register subscriber
      if (!channelMap.has(channel)) {
        channelMap.set(channel, new Set())
      }
      channelMap.get(channel)!.add(callback)

      try {
        while (true) {
          if (queue.length > 0) {
            yield queue.shift()
          } else {
            yield await new Promise<any>((res) => {
              resolve = (result) => res(result.value)
            })
          }
        }
      } finally {
        // Cleanup subscription
        channelMap.get(channel)?.delete(callback)
      }
    },
  }
}
