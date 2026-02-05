import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { MessageTimestamp } from './message-timestamp'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type MessageActionsBarProps = {
  text: string
  align: 'start' | 'end'
  timestamp: number
  forceVisible?: boolean
}

export function MessageActionsBar({
  text,
  align,
  timestamp,
  forceVisible = false,
}: MessageActionsBarProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  const positionClass = align === 'end' ? 'justify-end' : 'justify-start'

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-primary-600 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 duration-100 ease-out',
        forceVisible ? 'opacity-100' : 'opacity-0',
        positionClass,
      )}
    >
      <TooltipProvider>
        <TooltipRoot>
          <TooltipTrigger
            type="button"
            onClick={() => {
              handleCopy().catch(() => {})
            }}
            className="inline-flex items-center justify-center rounded border border-transparent bg-transparent p-1 text-primary-700 hover:text-primary-900 hover:bg-primary-100"
          >
            <HugeiconsIcon
              icon={copied ? Tick02Icon : Copy01Icon}
              size={16}
              strokeWidth={1.6}
            />
          </TooltipTrigger>
          <TooltipContent side="top">Copy</TooltipContent>
        </TooltipRoot>
      </TooltipProvider>
      <MessageTimestamp timestamp={timestamp} />
    </div>
  )
}
