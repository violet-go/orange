/**
 * PeelPack Server Entry Point
 *
 * Integrates:
 * - Hono (HTTP framework)
 * - GraphQL Yoga (GraphQL server with Subscription support)
 * - All base and core modules
 */

import { Hono } from 'hono'
import { createYoga } from 'graphql-yoga'
import { createSchema } from 'graphql-yoga'

// Base modules
import { loadConfig } from './base/config/proc'
import { createLogger } from './base/logger/proc'
import { createDatabase } from './base/db/proc'
import { createStorage } from './base/storage/proc'
import { createPubSub } from './base/pubsub/proc'

// Core modules
import { createPromptBuilder } from './core/prompt/proc'
import { createMockImageGen, createRealImageGen } from './core/image/proc'
import { createGenService } from './core/gen/proc'

// GraphQL
import { typeDefs } from './port/graphql/schema'
import { createResolvers } from './port/graphql/resolvers'
import type { GraphQLContext } from './port/graphql/context'

// ==================== Initialization ====================

const config = loadConfig()
const logger = createLogger({ level: config.logLevel })

logger.info('🚀 Starting PeelPack server', {
  port: config.port,
  dbPath: config.dbPath,
  storagePath: config.storagePath
})

// Initialize base modules
const db = createDatabase({ path: config.dbPath, logger })
const storage = createStorage({ basePath: config.storagePath })
const pubsub = createPubSub()

// Initialize core modules
const promptBuilder = createPromptBuilder()

// Phase 4: Switch to real API
const imageGen = createRealImageGen({
  apiKey: config.nanoBananaApiKey,
  baseUrl: config.nanoBananaBaseUrl,
  logger: logger.child('imageGen')
})

const genService = createGenService({
  db,
  storage,
  imageGen,
  promptBuilder,
  pubsub,
  logger
})

logger.info('✅ All modules initialized')

// ==================== GraphQL Yoga Setup ====================

const yoga = createYoga<GraphQLContext>({
  schema: createSchema({
    typeDefs,
    resolvers: createResolvers()
  }),
  context: () => ({
    db,
    genService,
    pubsub,
    logger: logger.child('graphql')
  }),
  // Enable GraphiQL playground in development
  graphiql: {
    title: 'PeelPack GraphQL Playground'
  },
  logging: {
    debug: (...args) => logger.debug('GraphQL', { args }),
    info: (...args) => logger.info('GraphQL', { args }),
    warn: (...args) => logger.warn('GraphQL', { args }),
    error: (...args) => logger.error('GraphQL', { args })
  }
})

logger.info('✅ GraphQL Yoga configured')

// ==================== Hono Application ====================

const app = new Hono()

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// GraphQL endpoint - handles both HTTP and WebSocket (for Subscriptions)
app.all('/graphql', async (c) => {
  const response = await yoga.fetch(
    c.req.raw,
    {
      db,
      genService,
      pubsub,
      logger: logger.child('graphql')
    }
  )
  return response
})

// Static file serving for generated images
app.get('/data/images/*', async (c) => {
  try {
    const requestPath = c.req.path // e.g., "/data/images/proj-123/img-456.png"
    const filePath = requestPath.replace('/data/', '') // "images/proj-123/img-456.png"

    logger.debug('Serving static file', { filePath })

    // Check if file exists
    const exists = await storage.exists(filePath)
    if (!exists) {
      logger.warn('File not found', { filePath })
      return c.text('File not found', 404)
    }

    // Read file
    const buffer = await storage.read(filePath)

    // Return with appropriate Content-Type
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      }
    })
  } catch (error) {
    logger.error('Error serving static file', error as Error)
    return c.text('Internal server error', 500)
  }
})

// Catch-all 404
app.notFound((c) => {
  return c.text('Not Found', 404)
})

// Global error handler
app.onError((err, c) => {
  logger.error('Unhandled error', err)
  return c.text('Internal Server Error', 500)
})

logger.info('✅ Hono routes configured')

// ==================== Server Export ====================

export default {
  port: config.port,
  fetch: app.fetch,
  // Enable WebSocket for GraphQL Subscriptions
  websocket: yoga.websocket
}

logger.info(`🎉 Server ready on http://localhost:${config.port}`)
logger.info(`📊 GraphQL Playground: http://localhost:${config.port}/graphql`)
