import { useQuery } from '@tanstack/react-query'
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
      <div className="flex flex-wrap gap-3 justify-center">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="px-4 py-2 rounded-full animate-pulse"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              width: '120px',
              height: '36px'
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* No style option */}
      <StyleTag
        id={null}
        displayName="默认风格"
        isSelected={selectedId === null}
        onSelect={() => onSelect(null)}
      />

      {/* Preset styles */}
      {styles?.map((style) => (
        <StyleTag
          key={style.id}
          id={style.id}
          displayName={style.displayName}
          isSelected={selectedId === style.id}
          onSelect={() => onSelect(style.id)}
        />
      ))}
    </>
  )
}

interface StyleTagProps {
  id: string | null
  displayName: string
  isSelected: boolean
  onSelect: () => void
}

function StyleTag({ displayName, isSelected, onSelect }: StyleTagProps) {
  return (
    <button
      onClick={onSelect}
      className={`style-tag-button ${isSelected ? 'selected' : ''}`}
    >
      <span className="tag-hover-effect" />
      <span className="tag-content">{displayName}</span>
    </button>
  )
}
