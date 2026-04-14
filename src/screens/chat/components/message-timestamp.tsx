'use client'

import { useState, useEffect } from 'react'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type MessageTimestampProps = {
  timestamp: number
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatShort(timestamp: number, now: Date): string {
  const date = new Date(timestamp)
  if (isSameDay(date, now)) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function formatFull(timestamp: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

export function MessageTimestamp({ timestamp }: MessageTimestampProps) {
  // Client-side only to avoid hydration mismatch
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
  }, [])

  const shortLabel = now ? formatShort(timestamp, now) : formatFull(timestamp)
  const fullLabel = formatFull(timestamp)

  return (
    <TooltipProvider>
      <TooltipRoot>
        <TooltipTrigger className="inline-flex items-center text-xs text-primary-600">
          {shortLabel}
        </TooltipTrigger>
        <TooltipContent side="top">{fullLabel}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}
