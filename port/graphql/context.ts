/**
 * GraphQL Context Type Definition
 *
 * Context is passed to every resolver, providing access to:
 * - Database operations
 * - Generation service
 * - PubSub for subscriptions
 * - Logger for debugging
 */

import type { Database } from '../../base/db/type'
import type { Logger } from '../../base/logger/type'
import type { PubSub } from '../../base/pubsub/type'
import type { GenService } from '../../core/gen/type'

export interface GraphQLContext {
  db: Database
  genService: GenService
  pubsub: PubSub
  logger: Logger
}
