/**
 * GraphQL Resolvers
 *
 * Implementation of Query, Mutation, Subscription, and Field resolvers
 * Following schema defined in schema.ts
 */

import type { GraphQLContext } from './context'

/**
 * DateTime scalar resolver - converts Unix timestamp to ISO string
 */
const DateTimeScalar = {
  serialize(value: number): string {
    return new Date(value).toISOString()
  },
  parseValue(value: string): number {
    return new Date(value).getTime()
  },
  parseLiteral(ast: any): number {
    if (ast.kind === 'StringValue') {
      return new Date(ast.value).getTime()
    }
    throw new Error('DateTime must be a string')
  }
}

export function createResolvers() {
  return {
    // ==================== Scalars ====================
    DateTime: DateTimeScalar,

    // ==================== Query ====================
    Query: {
      /**
       * Get project by ID
       * Returns null if not found
       */
      project: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
        ctx.logger.debug('Query.project', { id })
        return ctx.db.getProject(id)
      },

      /**
       * List projects with pagination and filtering
       */
      projects: async (
        _: any,
        { limit = 20, offset = 0, status }: { limit?: number; offset?: number; status?: string },
        ctx: GraphQLContext
      ) => {
        ctx.logger.debug('Query.projects', { limit, offset, status })

        // Get all projects from database (in-memory filtering for now)
        const allProjects = ctx.db.getAllProjects?.() || []

        // Filter by status if provided
        let filteredProjects = allProjects
        if (status) {
          filteredProjects = allProjects.filter(p => p.status.toLowerCase() === status.toLowerCase())
        }

        // Sort by created_at descending (newest first)
        filteredProjects.sort((a, b) => b.createdAt - a.createdAt)

        // Apply pagination
        const paginatedProjects = filteredProjects.slice(offset, offset + limit)

        return {
          nodeArray: paginatedProjects,
          totalCount: filteredProjects.length,
          hasMore: offset + limit < filteredProjects.length
        }
      },

      /**
       * List all active style presets
       * Returns empty array if none exist
       */
      styles: async (_: any, __: any, ctx: GraphQLContext) => {
        ctx.logger.debug('Query.styles')
        return ctx.db.getActiveStyles()
      }
    },

    // ==================== Mutation ====================
    Mutation: {
      /**
       * Create a new image generation project
       * Returns immediately with pending status
       * Actual generation happens asynchronously in background
       */
      createProject: async (
        _: any,
        { input }: { input: any },
        ctx: GraphQLContext
      ) => {
        ctx.logger.info('Mutation.createProject', {
          inputType: input.inputType,
          contentLength: input.inputContent?.length
        })

        // Call GenService to create project and start generation
        const projectId = await ctx.genService.generate({
          inputType: input.inputType.toLowerCase(), // Convert enum to lowercase
          inputContent: input.inputContent,
          styleId: input.styleId,
          customPrompt: input.customPrompt,
          seed: input.seed
        })

        // Fetch the created project
        const project = ctx.db.getProject(projectId)

        if (!project) {
          throw new Error('Failed to create project')
        }

        ctx.logger.info('Project created', { projectId, status: project.status })

        return { project }
      }
    },

    // ==================== Subscription ====================
    Subscription: {
      /**
       * Subscribe to project progress updates
       * Receives real-time updates as images complete
       */
      projectProgress: {
        subscribe: async (
          _: any,
          { projectId }: { projectId: string },
          ctx: GraphQLContext
        ) => {
          ctx.logger.info('Subscription.projectProgress.subscribe', { projectId })

          // Subscribe to PubSub channel for this project
          const channel = `project:${projectId}`
          return ctx.pubsub.subscribe(channel)
        },

        resolve: (payload: any) => {
          // Payload is already in the correct format from GenService
          return payload
        }
      }
    },

    // ==================== Field Resolvers ====================

    /**
     * Project field resolvers
     */
    Project: {
      /**
       * Resolve images for a project
       * Lazy-loaded when images field is requested
       */
      images: async (project: any, { limit }: { limit?: number }, ctx: GraphQLContext) => {
        const allImages = ctx.db.getImagesByProject(project.id)
        return limit ? allImages.slice(0, limit) : allImages
      },

      /**
       * Resolve style for a project
       */
      style: async (project: any, _: any, ctx: GraphQLContext) => {
        if (!project.styleId) return null
        return ctx.db.getStyle(project.styleId)
      },

      /**
       * Uppercase the inputType enum for GraphQL
       */
      inputType: (project: any) => {
        return project.inputType.toUpperCase()
      },

      /**
       * Uppercase the status enum for GraphQL
       */
      status: (project: any) => {
        return project.status.toUpperCase()
      }
    },

    /**
     * Image field resolvers
     */
    Image: {
      /**
       * Convert file path to accessible URL with full backend URL
       * e.g., "data/images/proj-123/img-456.png" -> "http://localhost:3000/data/images/proj-123/img-456.png"
       */
      fileUrl: (image: any) => {
        // Return absolute URL to backend server
        return `http://localhost:3000/${image.filePath}`
      },

      /**
       * Uppercase the category enum for GraphQL
       */
      category: (image: any) => {
        return image.category.toUpperCase()
      },

      /**
       * Uppercase the status enum for GraphQL
       */
      status: (image: any) => {
        return image.status.toUpperCase()
      }
    },

    /**
     * ProjectProgressUpdate field resolvers
     */
    ProjectProgressUpdate: {
      /**
       * Uppercase the status enum for GraphQL
       */
      status: (update: any) => {
        return update.status.toUpperCase()
      },

      /**
       * Ensure timestamp is a number (Unix timestamp)
       */
      timestamp: (update: any) => {
        if (update.timestamp instanceof Date) {
          return update.timestamp.getTime()
        }
        return update.timestamp
      }
    }
  }
}
