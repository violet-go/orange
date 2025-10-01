/**
 * GraphQL Schema Definition (SDL)
 *
 * Schema-first approach: define types and structure here,
 * implement resolvers separately in resolvers.ts
 */

export const typeDefs = /* GraphQL */ `
  scalar DateTime

  # ==================== Query ====================

  type Query {
    """
    Get project details by ID
    """
    project(id: ID!): Project

    """
    List projects with pagination and filtering
    """
    projects(limit: Int, offset: Int, status: String): ProjectConnection!

    """
    List all active style presets
    """
    styles: [Style!]!
  }

  # ==================== Mutation ====================

  type Mutation {
    """
    Create a new image generation project
    Returns immediately with pending status, actual generation happens asynchronously
    """
    createProject(input: CreateProjectInput!): CreateProjectPayload!
  }

  # ==================== Subscription ====================

  type Subscription {
    """
    Subscribe to real-time progress updates for a project
    Pushes update each time an image completes or fails
    """
    projectProgress(projectId: ID!): ProjectProgressUpdate!
  }

  # ==================== Input Types ====================

  input CreateProjectInput {
    """
    Type of input content
    """
    inputType: InputType!

    """
    Text description for TEXT type, base64 image data for IMAGE type
    """
    inputContent: String!

    """
    Optional: apply a preset style
    """
    styleId: ID

    """
    Optional: custom prompt additions
    """
    customPrompt: String

    """
    Optional: random seed for reproducibility (auto-generated if not provided)
    """
    seed: Int

    """
    Optional: ID of project to remix from
    """
    remixFromId: ID
  }

  # ==================== Payload Types ====================

  type CreateProjectPayload {
    project: Project!
  }

  # ==================== Core Types ====================

  type Project {
    id: ID!
    inputType: InputType!
    inputContent: String!
    status: ProjectStatus!
    style: Style
    images(limit: Int): [Image!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Image {
    id: ID!
    category: ImageCategory!
    emotionType: String
    surpriseIndex: Int
    prompt: String!
    fileUrl: String!
    status: ImageStatus!
    errorMessage: String
    width: Int
    height: Int
    createdAt: DateTime!
  }

  type Style {
    id: ID!
    displayName: String!
    description: String!
    promptTemplate: String!
    thumbnailUrl: String
  }

  type ProjectProgressUpdate {
    projectId: ID!
    status: ProjectStatus!
    completedCount: Int!
    totalCount: Int!
    latestImage: Image
    timestamp: DateTime!
  }

  type ProjectConnection {
    nodeArray: [Project!]!
    totalCount: Int!
    hasMore: Boolean!
  }

  # ==================== Enums ====================

  enum InputType {
    TEXT
    IMAGE
    MIXED
  }

  enum ProjectStatus {
    PENDING
    GENERATING
    COMPLETED
    PARTIAL_FAILED
  }

  enum ImageCategory {
    EMOTION
    SURPRISE
  }

  enum ImageStatus {
    PENDING
    GENERATING
    SUCCESS
    FAILED
  }
`
