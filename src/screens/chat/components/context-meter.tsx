import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

type ContextMeterProps = {
  totalTokens?: number
  contextTokens?: number
  className?: string
}

/**
 * Format a token count into a compact human-readable string.
 * Examples: 0→"0", 500→"500", 1000→"1K", 1500→"1.5K",
 * 32000→"32K", 128000→"128K", 999999→"1M", 1000000→"1M",
 * 1200000→"1.2M", 2000000→"2M"
 */
function formatTokens(count: number): string {
  if (count <= 0) return '0'
  if (count >= 1_000_000) {
    const m = count / 1_000_000
    // Round to 1 decimal place; drop trailing ".0"
    const s = m.toFixed(1)
    return s.endsWith('.0') ? `${Math.round(m)}M` : `${s}M`
  }
  if (count >= 100_000) {
    // 100K+ — show whole K (128K, 200K, 999K)
    return `${Math.round(count / 1_000)}K`
  }
  if (count >= 10_000) {
    // 10K-99K — show whole K (10K, 32K, 99K)
    return `${Math.round(count / 1_000)}K`
  }
  if (count >= 1_000) {
    // 1K-9.9K — show one decimal if needed (1K, 1.5K, 9.9K)
    const k = count / 1_000
    const s = k.toFixed(1)
    return s.endsWith('.0') ? `${Math.round(k)}K` : `${s}K`
  }
  return String(Math.round(count))
}

/** Get the color classes for the progress bar based on usage percentage */
function getMeterColor(percentage: number): {
  bar: string
  text: string
} {
  if (percentage >= 90) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
    }
  }
  if (percentage >= 70) {
    return {
      bar: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
    }
  }
  return {
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  }
}

function ContextMeterComponent({
  totalTokens,
  contextTokens,
  className,
}: ContextMeterProps) {
  const { percentage, usedStr, maxStr, colors, hasData, isNearlyFull } =
    useMemo(() => {
      // Hide when we have no context window info at all
      if (typeof contextTokens !== 'number' || contextTokens <= 0) {
        return {
          percentage: 0,
          usedStr: '',
          maxStr: '',
          colors: getMeterColor(0),
          hasData: false,
          isNearlyFull: false,
        }
      }

      // Treat undefined/null totalTokens as 0 (new session with no messages yet)
      const used =
        typeof totalTokens === 'number' && totalTokens > 0 ? totalTokens : 0
      const pct = Math.min(
        100,
        Math.round((used / contextTokens) * 100),
      )
      return {
        percentage: pct,
        usedStr: formatTokens(used),
        maxStr: formatTokens(contextTokens),
        colors: getMeterColor(pct),
        hasData: true,
        isNearlyFull: pct >= 95,
      }
    }, [totalTokens, contextTokens])

  if (!hasData) return null

  const usedDisplay =
    typeof totalTokens === 'number' && totalTokens > 0
      ? totalTokens.toLocaleString()
      : '0'
  const maxDisplay =
    typeof contextTokens === 'number' ? contextTokens.toLocaleString() : '0'

  return (
    <div
      className={cn('group relative flex items-center gap-1.5', className)}
      title={`Context: ${usedDisplay} / ${maxDisplay} tokens (${percentage}%)`}
    >
      {/* Compact view: bar + percentage */}
      <div className="flex items-center gap-1.5">
        {/* Progress bar */}
        <div className="w-12 h-1.5 rounded-full bg-primary-200 dark:bg-primary-700 overflow-hidden shrink-0 group-hover:h-2 transition-all">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              colors.bar,
              isNearlyFull && 'animate-pulse',
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Compact label (always visible) */}
        <span
          className={cn(
            'text-[10px] leading-none font-medium tabular-nums whitespace-nowrap',
            isNearlyFull
              ? colors.text
              : 'text-primary-500 dark:text-primary-400',
          )}
        >
          {usedStr}
        </span>
      </div>

      {/* Expanded details on hover */}
      <div
        className={cn(
          'absolute right-0 top-full mt-1 z-50',
          'pointer-events-none opacity-0 scale-95',
          'group-hover:pointer-events-auto group-hover:opacity-100 group-hover:scale-100',
          'transition-all duration-150 origin-top-right',
        )}
      >
        <div
          className={cn(
            'rounded-md border border-primary-200 dark:border-primary-700',
            'bg-surface shadow-lg px-3 py-2',
            'text-xs whitespace-nowrap',
          )}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-primary-500 dark:text-primary-500">
              Context window
            </span>
            <span className={cn('font-semibold', colors.text)}>
              {percentage}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-primary-700 dark:text-primary-700">
            <span className="font-medium">{usedStr}</span>
            <span className="text-primary-400 dark:text-primary-500">/</span>
            <span>{maxStr}</span>
            <span className="text-primary-400 dark:text-primary-500">tokens</span>
          </div>
          {/* Wider bar in tooltip */}
          <div className="w-full h-1.5 rounded-full bg-primary-200 dark:bg-primary-700 overflow-hidden mt-1.5">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 ease-out',
                colors.bar,
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {isNearlyFull && (
            <div className="mt-1.5 text-[10px] text-red-500 dark:text-red-400 font-medium">
              ⚠ Context nearly full — consider /compact
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const MemoizedContextMeter = memo(ContextMeterComponent)

export { MemoizedContextMeter as ContextMeter }
