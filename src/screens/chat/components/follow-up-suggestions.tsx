import { memo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, Loading03Icon } from '@hugeicons/core-free-icons'
import { useFollowUpSuggestions } from '../hooks/use-follow-up-suggestions'
import { cn } from '@/lib/utils'

type FollowUpSuggestionsProps = {
  /** The assistant's response text to generate follow-ups from */
  responseText: string
  /** Optional conversation context summary for better suggestions */
  contextSummary?: string
  /** Callback when a suggestion is clicked */
  onSuggestionClick: (suggestion: string) => void
  /** Whether suggestions are disabled (e.g., while waiting for response) */
  disabled?: boolean
  /** Additional class name for the container */
  className?: string
}

function FollowUpSuggestionsComponent({
  responseText,
  contextSummary,
  onSuggestionClick,
  disabled = false,
  className,
}: FollowUpSuggestionsProps) {
  const { suggestions, isLoading, source } = useFollowUpSuggestions(
    responseText,
    contextSummary,
    {
      minResponseLength: 50,
      timeoutMs: 8000,
    },
  )

  // Don't render if no suggestions and not loading
  if (suggestions.length === 0 && !isLoading) {
    return null
  }

  return (
    <div className={cn('flex flex-col gap-2 mt-3', className)}>
      <div className="flex items-center gap-1.5 text-xs text-primary-500">
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
          ) : source === 'llm' ? (
            'AI suggestions'
          ) : (
            'Follow-up suggestions'
          )}
        </span>
      </div>
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
              // Subtle animation when suggestions update from heuristic to LLM
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
