import { memo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, Loading03Icon } from '@hugeicons/core-free-icons'
import { useFollowUpSuggestions } from '../hooks/use-follow-up-suggestions'
import { cn } from '@/lib/utils'

type FollowUpSuggestionsProps = {
  responseText: string
  conversationContext?: string
  onSuggestionClick: (suggestion: string) => void
  disabled?: boolean
  className?: string
}

function FollowUpSuggestionsComponent({
  responseText,
  conversationContext,
  onSuggestionClick,
  disabled = false,
  className,
}: FollowUpSuggestionsProps) {
  const { suggestions, isLoading, source } = useFollowUpSuggestions(
    responseText,
    conversationContext,
    {
      minResponseLength: 50,
      timeoutMs: 8000,
    },
  )

  if (suggestions.length === 0 && !isLoading) {
    return null
  }

  const showHeader = isLoading || suggestions.length > 0

  return (
    <div className={cn('flex flex-col gap-2 mt-3', className)}>
      {showHeader ? <div className="flex items-center gap-1.5 text-xs text-primary-500">
        <span className="text-primary-400">✨</span>
        <span>
          {isLoading ? (
            <span className="flex items-center gap-1">
              Thinking of follow-ups
              <HugeiconsIcon
                icon={Loading03Icon}
                size={12}
                strokeWidth={2}
                className="animate-spin text-primary-400"
              />
            </span>
          ) : source === 'openclaw' ? (
            'AI suggestions'
          ) : (
            'Follow-up suggestions'
          )}
        </span>
      </div> : null}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={`${index}-${suggestion.slice(0, 20)}`}
            type="button"
            disabled={disabled}
            onClick={() => onSuggestionClick(suggestion)}
            className={cn(
              'group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
              'text-sm text-primary-700 bg-primary-50 border border-primary-200',
              'hover:bg-primary-100 hover:border-primary-300 hover:text-primary-900',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-1',
              'transition-all duration-150 cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-50 disabled:hover:border-primary-200',
              isLoading && 'opacity-75',
            )}
          >
            <span>{suggestion}</span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              strokeWidth={2}
              className="text-primary-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all duration-150"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

const MemoizedFollowUpSuggestions = memo(FollowUpSuggestionsComponent)

export { MemoizedFollowUpSuggestions as FollowUpSuggestions }
