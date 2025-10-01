import { gql } from 'graphql-request'

export const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      project {
        id
        status
        createdAt
      }
    }
  }
`

export const RETRY_IMAGE_MUTATION = gql`
  mutation RetryImage($id: ID!) {
    retryImage(id: $id) {
      image {
        id
        status
        fileUrl
        errorMessage
      }
    }
  }
`
