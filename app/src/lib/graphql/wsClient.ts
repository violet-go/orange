import { createClient } from 'graphql-ws'

export const wsClient = createClient({
  url: 'ws://localhost:3000/graphql',
  retryAttempts: 3,
  shouldRetry: () => true,
  connectionParams: () => ({
    // Can pass authentication token here
  }),
})

// Cleanup function (call on component unmount)
export const cleanupWsClient = () => {
  wsClient.dispose()
}
