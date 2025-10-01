import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { wsClient } from '../lib/graphql/wsClient'
import { PROJECT_PROGRESS_SUBSCRIPTION } from '../lib/graphql/subscriptions'

interface ProgressUpdate {
  projectId: string
  status: string
  completedCount: number
  totalCount: number
  latestImage?: {
    id: string
    category: string
    emotionType: string | null
    fileUrl: string
    status: string
  }
  timestamp: string
}

export function useProjectProgress(projectId: string, enabled: boolean = true) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const unsubscribe = wsClient.subscribe(
      {
        query: PROJECT_PROGRESS_SUBSCRIPTION,
        variables: { projectId },
      },
      {
        next: (data) => {
          const update = data.data?.projectProgress as ProgressUpdate
          setProgress(update)

          // Update TanStack Query cache
          queryClient.setQueryData(['project', projectId], (old: any) => {
            if (!old) return old
            return {
              ...old,
              status: update.status,
              images: update.latestImage
                ? updateImageInArray(old.images, update.latestImage)
                : old.images,
            }
          })
        },
        error: (err) => {
          console.error('Subscription error:', err)
          setError(err as Error)
        },
        complete: () => {
          console.log('Subscription completed')
        },
      }
    )

    return () => {
      unsubscribe()
    }
  }, [projectId, enabled, queryClient])

  return { progress, error }
}

function updateImageInArray(imageArray: any[], newImage: any) {
  const index = imageArray.findIndex((img) => img.id === newImage.id)
  if (index === -1) return imageArray
  const updated = [...imageArray]
  updated[index] = { ...updated[index], ...newImage }
  return updated
}
