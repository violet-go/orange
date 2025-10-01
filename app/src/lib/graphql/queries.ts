import { gql } from 'graphql-request'

export const GET_PROJECT_QUERY = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      inputType
      inputContent
      status
      createdAt
      style {
        id
        displayName
      }
      images {
        id
        category
        emotionType
        surpriseIndex
        prompt
        fileUrl
        status
        errorMessage
        width
        height
        createdAt
      }
    }
  }
`

export const GET_STYLES_QUERY = gql`
  query GetStyles {
    styles {
      id
      displayName
      description
      promptTemplate
      thumbnailUrl
    }
  }
`
