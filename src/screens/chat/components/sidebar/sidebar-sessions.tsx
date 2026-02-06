'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from '@/components/ui/collapsible'
import {
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
} from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { SessionItem } from './session-item'
import type { SessionMeta } from '../../types'
import { memo, useCallback, useMemo, useState } from 'react'

const PINNED_SESSIONS_KEY = 'opencami-pinned-sessions'
const FOLDER_STATE_KEY = 'opencami-sidebar-folders'

type FolderKey = 'subagent' | 'cron' | 'other'
type FolderState = Record<FolderKey, boolean>

const defaultFolderState: FolderState = {
  subagent: false,
  cron: false,
  other: false,
}

function readPinnedSessionKeys(): Array<string> {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(PINNED_SESSIONS_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

function writePinnedSessionKeys(keys: Array<string>) {
  if (typeof window === 'undefined') return
  try {
    const uniqueKeys = Array.from(new Set(keys))
    localStorage.setItem(PINNED_SESSIONS_KEY, JSON.stringify(uniqueKeys))
  } catch {
    // Ignore storage errors.
  }
}

function readFolderState(): FolderState {
  if (typeof window === 'undefined') return { ...defaultFolderState }
  try {
    const stored = localStorage.getItem(FOLDER_STATE_KEY)
    if (!stored) return { ...defaultFolderState }
    const parsed = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object') return { ...defaultFolderState }
    return {
      subagent:
        typeof parsed.subagent === 'boolean'
          ? parsed.subagent
          : defaultFolderState.subagent,
      cron:
        typeof parsed.cron === 'boolean' ? parsed.cron : defaultFolderState.cron,
      other:
        typeof parsed.other === 'boolean'
          ? parsed.other
          : defaultFolderState.other,
    }
  } catch {
    return { ...defaultFolderState }
  }
}

function writeFolderState(state: FolderState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FOLDER_STATE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors.
  }
}

type SidebarSessionsProps = {
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  defaultOpen?: boolean
  onSelect?: () => void
  onRename: (session: SessionMeta) => void
  onDelete: (session: SessionMeta) => void
  onExport: (session: SessionMeta) => void
}

export const SidebarSessions = memo(function SidebarSessions({
  sessions,
  activeFriendlyId,
  defaultOpen = true,
  onSelect,
  onRename,
  onDelete,
  onExport,
}: SidebarSessionsProps) {
  const [pinnedSessionKeys, setPinnedSessionKeys] = useState<Array<string>>(() =>
    readPinnedSessionKeys(),
  )
  const [folderState, setFolderState] = useState<FolderState>(() =>
    readFolderState(),
  )
  const pinnedSessionKeySet = useMemo(
    () => new Set(pinnedSessionKeys),
    [pinnedSessionKeys],
  )
  const pinnedSessions = sessions.filter((session) =>
    pinnedSessionKeySet.has(session.key),
  )
  const unpinnedSessions = sessions.filter(
    (session) => !pinnedSessionKeySet.has(session.key),
  )
  const showDivider = pinnedSessions.length > 0 && unpinnedSessions.length > 0
  const groupedSessions = useMemo(() => {
    const groups: Record<
      NonNullable<SessionMeta['kind']>,
      Array<SessionMeta>
    > = {
      chat: [],
      subagent: [],
      cron: [],
      other: [],
    }
    for (const session of unpinnedSessions) {
      const kind = session.kind ?? 'other'
      groups[kind].push(session)
    }
    return groups
  }, [unpinnedSessions])

  const handleTogglePin = useCallback((session: SessionMeta) => {
    setPinnedSessionKeys((prevKeys) => {
      const isPinned = prevKeys.includes(session.key)
      const nextKeys = isPinned
        ? prevKeys.filter((key) => key !== session.key)
        : [...prevKeys, session.key]
      writePinnedSessionKeys(nextKeys)
      return nextKeys
    })
  }, [])

  const handleFolderOpenChange = useCallback(
    (folderKey: FolderKey, open: boolean) => {
      setFolderState((prevState) => {
        const nextState = { ...prevState, [folderKey]: open }
        writeFolderState(nextState)
        return nextState
      })
    },
    [],
  )

  function renderFolderGroup(
    folderKey: FolderKey,
    label: string,
    sessionsForGroup: Array<SessionMeta>,
  ) {
    if (sessionsForGroup.length === 0) return null
    return (
      <Collapsible
        className="flex flex-col"
        open={folderState[folderKey]}
        onOpenChange={(open) => handleFolderOpenChange(folderKey, open)}
      >
        <CollapsibleTrigger
          className={cn(
            'w-full justify-between border-l-2 border-primary-200/70 px-2 py-1 text-[11px] font-medium text-primary-500/80 text-balance',
          )}
        >
          <span className="truncate">{label}</span>
          <span
            className={cn(
              'rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 tabular-nums',
            )}
          >
            {sessionsForGroup.length}
          </span>
        </CollapsibleTrigger>
        <CollapsiblePanel contentClassName="flex flex-col gap-px">
          {sessionsForGroup.map((session) => (
            <SessionItem
              key={session.key}
              session={session}
              active={session.friendlyId === activeFriendlyId}
              isPinned={false}
              onSelect={onSelect}
              onTogglePin={handleTogglePin}
              onRename={onRename}
              onDelete={onDelete}
              onExport={onExport}
            />
          ))}
        </CollapsiblePanel>
      </Collapsible>
    )
  }

  return (
    <Collapsible
      className="flex h-full flex-col flex-1 min-h-0 w-full"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger className="w-fit pl-1.5 shrink-0 text-balance">
        Sessions
        <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-3 transition-transform duration-150 group-data-panel-open:rotate-90"
          />
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel
        className="w-full flex-1 min-h-0 h-auto data-starting-style:h-0 data-ending-style:h-0"
        contentClassName="flex flex-1 min-h-0 flex-col overflow-y-auto"
      >
        <ScrollAreaRoot className="flex-1 min-h-0">
          <ScrollAreaViewport className="min-h-0">
            <div className="flex flex-col gap-2 pl-2 pr-2">
              {pinnedSessions.map((session) => (
                <SessionItem
                  key={session.key}
                  session={session}
                  active={session.friendlyId === activeFriendlyId}
                  isPinned
                  onSelect={onSelect}
                  onTogglePin={handleTogglePin}
                  onRename={onRename}
                  onDelete={onDelete}
                  onExport={onExport}
                />
              ))}
              {showDivider ? (
                <div className="my-1 border-t border-primary-200/80" />
              ) : null}
              {groupedSessions.chat.length > 0 ? (
                <div className="flex flex-col gap-px">
                  <div
                    className={cn(
                      'border-l-2 border-primary-200/70 px-2 py-1 text-[11px] font-medium text-primary-500/80 text-balance',
                    )}
                  >
                    💬 Chats
                  </div>
                  <div className="flex flex-col gap-px">
                    {groupedSessions.chat.map((session) => (
                      <SessionItem
                        key={session.key}
                        session={session}
                        active={session.friendlyId === activeFriendlyId}
                        isPinned={false}
                        onSelect={onSelect}
                        onTogglePin={handleTogglePin}
                        onRename={onRename}
                        onDelete={onDelete}
                        onExport={onExport}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {renderFolderGroup(
                'subagent',
                '🤖 Sub-agents',
                groupedSessions.subagent,
              )}
              {renderFolderGroup(
                'cron',
                '⏰ Cron / Isolated',
                groupedSessions.cron,
              )}
              {renderFolderGroup('other', '📁 Other', groupedSessions.other)}
            </div>
          </ScrollAreaViewport>
          <ScrollAreaScrollbar orientation="vertical">
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
        </ScrollAreaRoot>
      </CollapsiblePanel>
    </Collapsible>
  )
}, areSidebarSessionsEqual)

function areSidebarSessionsEqual(
  prev: SidebarSessionsProps,
  next: SidebarSessionsProps,
) {
  if (prev.activeFriendlyId !== next.activeFriendlyId) return false
  if (prev.defaultOpen !== next.defaultOpen) return false
  if (prev.onSelect !== next.onSelect) return false
  if (prev.onRename !== next.onRename) return false
  if (prev.onDelete !== next.onDelete) return false
  if (prev.onExport !== next.onExport) return false
  if (prev.sessions === next.sessions) return true
  if (prev.sessions.length !== next.sessions.length) return false
  for (let i = 0; i < prev.sessions.length; i += 1) {
    const prevSession = prev.sessions[i]
    const nextSession = next.sessions[i]
    if (prevSession.key !== nextSession.key) return false
    if (prevSession.friendlyId !== nextSession.friendlyId) return false
    if (prevSession.label !== nextSession.label) return false
    if (prevSession.title !== nextSession.title) return false
    if (prevSession.derivedTitle !== nextSession.derivedTitle) return false
    if (prevSession.updatedAt !== nextSession.updatedAt) return false
    if (prevSession.kind !== nextSession.kind) return false
  }
  return true
}
