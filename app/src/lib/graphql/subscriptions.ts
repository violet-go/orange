import { gql } from 'graphql-request'

export const PROJECT_PROGRESS_SUBSCRIPTION = gql`
  subscription ProjectProgress($projectId: ID!) {
    projectProgress(projectId: $projectId) {
      projectId
      status
      completedCount
      totalCount
      latestImage {
        id
        category
        emotionType
        fileUrl
        status
      }
      timestamp
    }
  }
`
