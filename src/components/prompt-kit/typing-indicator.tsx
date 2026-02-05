'use client'

import { TextShimmer } from './text-shimmer'
import { cn } from '@/lib/utils'

export type TypingIndicatorProps = {
  className?: string
}

function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
        <span
          className="relative inline-flex rounded-full h-1.5 w-1.5 bg-size-[200%_auto] animate-[shimmer_2s_infinite_linear]"
          style={{
            backgroundImage: `linear-gradient(to right, var(--color-primary-600) 0%, var(--color-primary-950) 50%, var(--color-primary-600) 100%)`,
          }}
        />
      </div>
      <TextShimmer className="text-sm" duration={2}>
        Generating...
      </TextShimmer>
    </div>
  )
}

export { TypingIndicator }
