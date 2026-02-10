'use client'

import { Link } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  MoreHorizontalIcon,
  Pen01Icon,
  Delete01Icon,
  Upload01Icon,
  BotIcon,
  Clock01Icon,
  Chat01Icon,
  Tick01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu'
import { memo } from 'react'
import type { SessionMeta, GatewayMessage } from '../../types'
import { isProtectedSession } from '../../utils'

function getKindIcon(kind: SessionMeta['kind']) {
  if (kind === 'subagent') return BotIcon
  if (kind === 'cron') return Clock01Icon
  return Chat01Icon
}

function previewFromMessage(message: GatewayMessage | null | undefined): string {
  if (!message || !Array.isArray(message.content)) return ''
  const text = message.content
    .map((part) => (part.type === 'text' ? String(part.text ?? '') : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 1_000_000_000_000) return value * 1000
    return value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

function getLastMessageTimestamp(message: GatewayMessage | null | undefined): number | null {
  if (!message) return null
  const candidates = [
    (message as any).createdAt,
    (message as any).created_at,
    (message as any).timestamp,
    (message as any).time,
    (message as any).ts,
  ]
  for (const candidate of candidates) {
    const normalized = normalizeTimestamp(candidate)
    if (normalized) return normalized
  }
  return null
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = timestamp - Date.now()
  const absMs = Math.abs(diffMs)

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['minute', 60_000],
    ['hour', 3_600_000],
    ['day', 86_400_000],
  ]

  let unit: Intl.RelativeTimeFormatUnit = 'minute'
  let divisor = 60_000

  if (absMs >= units[2][1]) {
    ;[unit, divisor] = units[2]
  } else if (absMs >= units[1][1]) {
    ;[unit, divisor] = units[1]
  }

  const value = Math.round(diffMs / divisor)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  return rtf.format(value, unit)
}

function subagentStatusTone(status: string | undefined): 'success' | 'error' | null {
  const normalized = String(status ?? '').toLowerCase().trim()
  if (!normalized) return null
  if (normalized === 'error' || normalized === 'failed') return 'error'
  if (normalized === 'completed' || normalized === 'ended' || normalized === 'done') {
    return 'success'
  }
  return null
}

type SessionItemProps = {
  session: SessionMeta
  active: boolean
  isGenerating?: boolean
  isPinned: boolean
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (session: SessionMeta) => void
  onSelect?: () => void
  onTogglePin: (session: SessionMeta) => void
  onRename: (session: SessionMeta) => void
  onDelete: (session: SessionMeta) => void
  onExport: (session: SessionMeta) => void
}

function SessionItemComponent({
  session,
  active,
  isGenerating = false,
  isPinned,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onSelect,
  onTogglePin,
  onRename,
  onDelete,
  onExport,
}: SessionItemProps) {
  const label =
    session.label || session.title || session.derivedTitle || session.friendlyId
  const KindIcon = getKindIcon(session.kind)
  const subagentPreviewRaw =
    session.kind === 'subagent' &&
    (session.lastMessage?.role === 'assistant' || session.lastMessage?.role === 'toolResult')
      ? previewFromMessage(session.lastMessage)
      : ''
  const subagentPreview =
    subagentPreviewRaw.length > 50
      ? `${subagentPreviewRaw.slice(0, 50).trimEnd()}…`
      : subagentPreviewRaw
  const subagentStatus =
    session.kind === 'subagent' ? subagentStatusTone(session.status) : null
  const cronLastRun =
    session.kind === 'cron'
      ? getLastMessageTimestamp(session.lastMessage)
      : null

  return (
    <Link
      to="/chat/$sessionKey"
      params={{ sessionKey: session.friendlyId }}
      onClick={(event) => {
        if (selectionMode) {
          event.preventDefault()
          event.stopPropagation()
          onToggleSelect?.(session)
          return
        }
        onSelect?.()
      }}
      className={cn(
        'group inline-flex items-center justify-between',
        'w-full text-left pl-1.5 pr-0.5 min-h-8 py-1 rounded-lg transition-colors duration-0',
        'select-none',
        active
          ? 'bg-primary-200 text-primary-950'
          : 'bg-transparent text-primary-950 [&:hover:not(:has(button:hover))]:bg-primary-200',
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {selectionMode ? (
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex items-center justify-center size-4 shrink-0 rounded border transition-colors',
              selected
                ? 'bg-primary-700 border-primary-700 text-white'
                : 'border-primary-300 bg-surface',
            )}
          >
            {selected ? (
              <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M2.5 6l2.5 2.5 4.5-5" />
              </svg>
            ) : null}
          </span>
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <HugeiconsIcon
              icon={KindIcon}
              size={12}
              strokeWidth={1.75}
              className="text-primary-500/70 shrink-0"
            />
            <div className="min-w-0 truncate text-sm font-[450]" title={label}>
              {isPinned ? (
                <span className="mr-1 text-xs text-primary-700" aria-hidden="true">
                  📌
                </span>
              ) : null}
              {label}
            </div>
            {session.kind === 'subagent' ? (
              isGenerating ? (
                <span
                  aria-label="Session active"
                  className="size-1.5 rounded-full bg-green-500 shrink-0"
                />
              ) : subagentStatus === 'success' ? (
                <HugeiconsIcon
                  icon={Tick01Icon}
                  size={12}
                  strokeWidth={1.8}
                  className="text-green-600/80 shrink-0"
                />
              ) : subagentStatus === 'error' ? (
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={12}
                  strokeWidth={1.8}
                  className="text-red-600/80 shrink-0"
                />
              ) : null
            ) : null}
          </div>
          {subagentPreview ? (
            <div className="text-[11px] text-primary-600/80 line-clamp-1 mt-0.5 pl-[18px]">
              {subagentPreview}
            </div>
          ) : null}
          {session.kind === 'cron' && cronLastRun ? (
            <div className="text-[10px] text-primary-500/75 line-clamp-1 mt-0.5 pl-[18px] font-mono">
              {formatRelativeTime(cronLastRun)}
            </div>
          ) : null}
        </div>
      </div>
      {selectionMode ? null : (
        <MenuRoot>
          <MenuTrigger
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            className={cn(
              'ml-2 inline-flex size-7 items-center justify-center rounded-md text-primary-700',
              'opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary-200',
              'aria-expanded:opacity-100 aria-expanded:bg-primary-200',
            )}
          >
            <HugeiconsIcon
              icon={MoreHorizontalIcon}
              size={20}
              strokeWidth={1.5}
            />
          </MenuTrigger>
          <MenuContent side="bottom" align="end">
            <MenuItem
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onTogglePin(session)
              }}
              className="gap-2"
            >
              <span className="text-xs" aria-hidden="true">
                📌
              </span>{' '}
              {isPinned ? 'Unpin Session' : 'Pin Session'}
            </MenuItem>
            <MenuItem
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onRename(session)
              }}
              className="gap-2"
            >
              <HugeiconsIcon icon={Pen01Icon} size={20} strokeWidth={1.5} />{' '}
              Rename
            </MenuItem>
            <MenuItem
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onExport(session)
              }}
              className="gap-2"
            >
              <HugeiconsIcon icon={Upload01Icon} size={20} strokeWidth={1.5} />{' '}
              Export
            </MenuItem>
            {isProtectedSession(session.key) ? null : (
              <MenuItem
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onDelete(session)
                }}
                className="text-red-700 gap-2 hover:bg-red-50/80 data-highlighted:bg-red-50/80"
              >
                <HugeiconsIcon icon={Delete01Icon} size={20} strokeWidth={1.5} />{' '}
                Delete
              </MenuItem>
            )}
          </MenuContent>
        </MenuRoot>
      )}
    </Link>
  )
}

function areSessionItemsEqual(prev: SessionItemProps, next: SessionItemProps) {
  if (prev.active !== next.active) return false
  if (prev.isGenerating !== next.isGenerating) return false
  if (prev.isPinned !== next.isPinned) return false
  if (prev.selectionMode !== next.selectionMode) return false
  if (prev.selected !== next.selected) return false
  if (prev.onToggleSelect !== next.onToggleSelect) return false
  if (prev.onSelect !== next.onSelect) return false
  if (prev.onTogglePin !== next.onTogglePin) return false
  if (prev.onRename !== next.onRename) return false
  if (prev.onDelete !== next.onDelete) return false
  if (prev.onExport !== next.onExport) return false
  if (prev.session === next.session) return true
  return (
    prev.session.key === next.session.key &&
    prev.session.friendlyId === next.session.friendlyId &&
    prev.session.label === next.session.label &&
    prev.session.title === next.session.title &&
    prev.session.derivedTitle === next.session.derivedTitle &&
    prev.session.updatedAt === next.session.updatedAt &&
    prev.session.kind === next.session.kind &&
    prev.session.status === next.session.status &&
    prev.session.lastMessage === next.session.lastMessage
  )
}

const SessionItem = memo(SessionItemComponent, areSessionItemsEqual)

export { SessionItem }
