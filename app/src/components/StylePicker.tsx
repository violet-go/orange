import { useQuery } from '@tanstack/react-query'
import { Card, CardBody, Skeleton } from '@heroui/react'
import { graphqlClient } from '../lib/graphql/client'
import { GET_STYLES_QUERY } from '../lib/graphql/queries'

interface Style {
  id: string
  displayName: string
  description: string
  thumbnailUrl: string | null
}

interface StylePickerProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function StylePicker({ selectedId, onSelect }: StylePickerProps) {
  const { data: styles, isLoading } = useQuery({
    queryKey: ['styles'],
    queryFn: async () => {
      const response = await graphqlClient.request<{ styles: Style[] }>(
        GET_STYLES_QUERY
      )
      return response.styles
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* No style option */}
      <StyleCard
        id={null}
        displayName="无"
        description="不使用预设风格"
        thumbnailUrl={null}
        isSelected={selectedId === null}
        onSelect={() => onSelect(null)}
      />

      {/* Preset styles */}
      {styles?.map((style) => (
        <StyleCard
          key={style.id}
          {...style}
          isSelected={selectedId === style.id}
          onSelect={() => onSelect(style.id)}
        />
      ))}
    </div>
  )
}

interface StyleCardProps {
  id: string | null
  displayName: string
  description: string
  thumbnailUrl: string | null
  isSelected: boolean
  onSelect: () => void
}

function StyleCard({
  displayName,
  description,
  thumbnailUrl,
  isSelected,
  onSelect,
}: StyleCardProps) {
  return (
    <Card
      isPressable
      onPress={onSelect}
      className={`transition-all duration-200 ${
        isSelected
          ? 'border-4 border-primary shadow-lg scale-105'
          : 'border-2 border-gray-200 hover:border-gray-300'
      }`}
    >
      <CardBody className="p-4">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={displayName}
            className="w-full aspect-square object-cover rounded-lg mb-3"
          />
        )}
        <h3 className="font-semibold text-gray-900 mb-1">{displayName}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
        {isSelected && (
          <div className="mt-2 flex items-center text-primary">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-medium">已选择</span>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
