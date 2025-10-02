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
import { makeHandler } from 'graphql-ws/use/bun'
import type { ExecutionArgs } from '@envelop/types'

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

const schema = createSchema({
  typeDefs,
  resolvers: createResolvers()
})

const yoga = createYoga<GraphQLContext>({
  schema,
  context: () => ({
    db,
    genService,
    pubsub,
    logger: logger.child('graphql')
  }),
  // Enable GraphiQL playground in development with WebSocket support
  graphiql: {
    title: 'PeelPack GraphQL Playground',
    subscriptionsProtocol: 'WS' // Use WebSocket instead of SSE
  },
  logging: {
    debug: (...args) => logger.debug('GraphQL', { args }),
    info: (...args) => logger.info('GraphQL', { args }),
    warn: (...args) => logger.warn('GraphQL', { args }),
    error: (...args) => logger.error('GraphQL', { args })
  }
})

// WebSocket handler for GraphQL Subscriptions
const websocketHandler = makeHandler({
  schema,
  execute: (args: any) => args.rootValue.execute(args),
  subscribe: (args: any) => args.rootValue.subscribe(args),
  onSubscribe: async (ctx, msg) => {
    const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
      ...ctx,
      req: ctx.extra.request,
      socket: ctx.extra.socket,
      params: msg.payload
    })

    const args = {
      schema,
      operationName: msg.payload.operationName,
      document: parse(msg.payload.query),
      variableValues: msg.payload.variables,
      contextValue: await contextFactory(),
      rootValue: {
        execute,
        subscribe
      }
    }

    const errors = validate(args.schema, args.document)
    if (errors.length) return errors

    return args
  }
})

logger.info('✅ GraphQL Yoga configured with WebSocket support')

// ==================== Hono Application ====================

const app = new Hono()

// CORS middleware - Allow frontend to access backend
app.use('/*', async (c, next) => {
  // When credentials: true, origin cannot be wildcard
  const origin = c.req.header('origin') || 'http://localhost:5173'
  c.header('Access-Control-Allow-Origin', origin)
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Allow-Credentials', 'true')

  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }

  await next()
})

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
  const requestPath = c.req.path // e.g., "/data/images/proj-123/img-456.png"
  const filePath = requestPath.replace('/data/', '') // "images/proj-123/img-456.png"

  logger.info('📸 Serving image', { requestPath, filePath })

  try {
    // Check if file exists
    const exists = await storage.exists(filePath)
    if (!exists) {
      logger.warn('⚠️ File not found', { filePath })
      // Ensure CORS headers on error response
      const origin = c.req.header('origin') || 'http://localhost:5173'
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Access-Control-Allow-Credentials', 'true')
      return c.text('File not found', 404)
    }

    // Read file
    const buffer = await storage.read(filePath)

    logger.info('✅ File served', { filePath, size: buffer.length })

    // Return with appropriate headers
    c.header('Content-Type', 'image/png')
    c.header('Cache-Control', 'public, max-age=31536000')
    c.header('Content-Length', String(buffer.length))
    return c.body(buffer)
  } catch (error) {
    logger.error('❌ Error serving file', { filePath, error: error as Error })
    // Ensure CORS headers on error response
    const origin = c.req.header('origin') || 'http://localhost:5173'
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Credentials', 'true')
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

// ==================== Bun Server with WebSocket Support ====================

const server = Bun.serve({
  port: config.port,
  fetch: async (request: Request, server: any): Promise<Response> => {
    // Try to upgrade to WebSocket for GraphQL subscriptions
    const url = new URL(request.url)
    if (url.pathname === '/graphql') {
      const upgraded = server.upgrade(request)
      if (upgraded) {
        return new Response() // Return empty response after upgrade
      }
    }

    // Otherwise, handle with Hono app (which includes Yoga for HTTP GraphQL)
    return app.fetch(request, server)
  },
  websocket: websocketHandler
})

logger.info(`🎉 Server ready on http://localhost:${server.port}`)
logger.info(`📊 GraphQL Playground: http://localhost:${server.port}/graphql`)
logger.info(`🔌 WebSocket endpoint: ws://localhost:${server.port}/graphql`)
