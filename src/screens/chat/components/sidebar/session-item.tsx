'use client'

import { Link } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  MoreHorizontalIcon,
  Pen01Icon,
  Delete01Icon,
  Upload01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu'
import { memo } from 'react'
import type { SessionMeta } from '../../types'

type SessionItemProps = {
  session: SessionMeta
  active: boolean
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
        'w-full text-left pl-1.5 pr-0.5 h-8 rounded-lg transition-colors duration-0',
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
          <div className="text-sm font-[450] line-clamp-1">
            {isPinned ? (
              <span className="mr-1 text-xs text-primary-700" aria-hidden="true">
                📌
              </span>
            ) : null}
            {label}
          </div>
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
          </MenuContent>
        </MenuRoot>
      )}
    </Link>
  )
}

function areSessionItemsEqual(prev: SessionItemProps, next: SessionItemProps) {
  if (prev.active !== next.active) return false
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
    prev.session.updatedAt === next.session.updatedAt
  )
}

const SessionItem = memo(SessionItemComponent, areSessionItemsEqual)

export { SessionItem }
