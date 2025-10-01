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
      className={`group relative overflow-hidden transition-all duration-300 border-0 ${
        isSelected
          ? 'shadow-2xl shadow-violet-500/30 ring-2 ring-violet-500 scale-[1.02]'
          : 'shadow-md hover:shadow-xl hover:scale-[1.02]'
      }`}
    >
      <CardBody className="p-0 relative">
        {/* Thumbnail or Placeholder */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={displayName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-6xl opacity-50">🎨</div>
            </div>
          )}

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Selected checkmark */}
          {isSelected && (
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shadow-lg animate-scale-in">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 bg-white">
          <h3 className={`font-semibold mb-1 transition-colors ${
            isSelected ? 'text-violet-600' : 'text-gray-900'
          }`}>
            {displayName}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
        </div>

        {/* Selected border glow */}
        {isSelected && (
          <div className="absolute inset-0 rounded-xl border-2 border-violet-500 pointer-events-none animate-glow" />
        )}
      </CardBody>
    </Card>
  )
}
