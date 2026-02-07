import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

type ContextMeterProps = {
  totalTokens?: number
  contextTokens?: number
  className?: string
}

/** Format a token count into a compact human-readable string (e.g. "32K", "1.2M") */
function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    const m = count / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (count >= 1_000) {
    const k = count / 1_000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  return String(count)
}

/** Get the color classes for the progress bar based on usage percentage */
function getMeterColor(percentage: number): {
  bar: string
  text: string
} {
  if (percentage >= 80) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
    }
  }
  if (percentage >= 50) {
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
  const { percentage, usedStr, maxStr, colors, hasData } = useMemo(() => {
    if (
      typeof totalTokens !== 'number' ||
      typeof contextTokens !== 'number' ||
      contextTokens <= 0
    ) {
      return {
        percentage: 0,
        usedStr: '',
        maxStr: '',
        colors: getMeterColor(0),
        hasData: false,
      }
    }

    const pct = Math.min(100, Math.round((totalTokens / contextTokens) * 100))
    return {
      percentage: pct,
      usedStr: formatTokens(totalTokens),
      maxStr: formatTokens(contextTokens),
      colors: getMeterColor(pct),
      hasData: true,
    }
  }, [totalTokens, contextTokens])

  if (!hasData) return null

  return (
    <div
      className={cn('group relative flex items-center gap-1.5', className)}
      title={`Context: ${totalTokens?.toLocaleString()} / ${contextTokens?.toLocaleString()} tokens (${percentage}%)`}
    >
      {/* Compact view: bar + percentage */}
      <div className="flex items-center gap-1.5">
        {/* Progress bar */}
        <div className="w-12 h-1.5 rounded-full bg-primary-200 dark:bg-primary-700 overflow-hidden shrink-0 group-hover:h-2 transition-all">
          <div
            className={cn('h-full rounded-full transition-all duration-300', colors.bar)}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Compact label (always visible) */}
        <span
          className={cn(
            'text-[10px] leading-none font-medium tabular-nums whitespace-nowrap',
            'text-primary-500 dark:text-primary-400',
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
            <span className="text-primary-500 dark:text-primary-400">Context window</span>
            <span className={cn('font-semibold', colors.text)}>{percentage}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-primary-700 dark:text-primary-300">
            <span className="font-medium">{usedStr}</span>
            <span className="text-primary-400">/</span>
            <span>{maxStr}</span>
            <span className="text-primary-400">tokens</span>
          </div>
          {/* Wider bar in tooltip */}
          <div className="w-full h-1.5 rounded-full bg-primary-200 dark:bg-primary-700 overflow-hidden mt-1.5">
            <div
              className={cn('h-full rounded-full transition-all duration-300', colors.bar)}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const MemoizedContextMeter = memo(ContextMeterComponent)

export { MemoizedContextMeter as ContextMeter }
