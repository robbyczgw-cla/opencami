'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, Delete01Icon } from '@hugeicons/core-free-icons'
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
import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { chatQueryKeys } from '../../chat-queries'
import { readError, isProtectedSession } from '../../utils'

const PINNED_SESSIONS_KEY = 'opencami-pinned-sessions'
const FOLDER_STATE_KEY = 'opencami-sidebar-folders'

type FolderKey = 'webchat' | 'subagent' | 'cron' | 'other'
type FolderState = Record<FolderKey, boolean>

const defaultFolderState: FolderState = {
  webchat: false,
  subagent: false,
  cron: false,
  other: false,
}

async function deleteSessionRequest(sessionKey: string) {
  const query = new URLSearchParams()
  if (sessionKey) query.set('sessionKey', sessionKey)
  const res = await fetch(`/api/sessions?${query.toString()}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await readError(res))
}

async function runWithConcurrency<T>(
  items: Array<T>,
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<Array<unknown>> {
  const errors: Array<unknown> = []
  let index = 0

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async function run() {
      while (index < items.length) {
        const currentIndex = index
        index += 1
        try {
          await worker(items[currentIndex])
        } catch (err) {
          errors.push(err)
        }
      }
    },
  )

  await Promise.all(runners)
  return errors
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
      webchat:
        typeof parsed.webchat === 'boolean'
          ? parsed.webchat
          : defaultFolderState.webchat,
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

function isSessionActive(session: SessionMeta, activeFriendlyId: string, activeSessionKey?: string): boolean {
  if (activeSessionKey && session.key) {
    return session.key === activeSessionKey
  }
  return session.friendlyId === activeFriendlyId
}

function isStatusGenerating(status: string | undefined): boolean {
  if (!status) return false
  const normalized = status.toLowerCase()
  return (
    normalized.includes('running') ||
    normalized.includes('active') ||
    normalized.includes('stream') ||
    normalized.includes('generat')
  )
}

function isSessionGenerating(
  session: SessionMeta,
  activeFriendlyId: string,
  activeSessionKey: string | undefined,
  isStreaming: boolean,
): boolean {
  if (isSessionActive(session, activeFriendlyId, activeSessionKey) && isStreaming) {
    return true
  }
  return isStatusGenerating(session.status)
}

type SidebarSessionsProps = {
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  activeSessionKey?: string
  isStreaming?: boolean
  defaultOpen?: boolean
  onSelect?: () => void
  onRename: (session: SessionMeta) => void
  onDelete: (session: SessionMeta) => void
  onExport: (session: SessionMeta) => void
}

export const SidebarSessions = memo(function SidebarSessions({
  sessions,
  activeFriendlyId,
  activeSessionKey,
  isStreaming = false,
  defaultOpen = true,
  onSelect,
  onRename,
  onDelete,
  onExport,
}: SidebarSessionsProps) {
  // Defer session list updates to prevent jank while typing/streaming
  const deferredSessions = useDeferredValue(sessions)
  const queryClient = useQueryClient()
  const [pinnedSessionKeys, setPinnedSessionKeys] = useState<Array<string>>(() =>
    readPinnedSessionKeys(),
  )
  const [folderState, setFolderState] = useState<FolderState>(() =>
    readFolderState(),
  )
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedSessionKeys, setSelectedSessionKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const pinnedSessionKeySet = useMemo(
    () => new Set(pinnedSessionKeys),
    [pinnedSessionKeys],
  )
  const pinnedSessions = deferredSessions.filter((session) =>
    pinnedSessionKeySet.has(session.key),
  )
  const unpinnedSessions = deferredSessions.filter(
    (session) => !pinnedSessionKeySet.has(session.key),
  )
  const showDivider = pinnedSessions.length > 0 && unpinnedSessions.length > 0
  const groupedSessions = useMemo(() => {
    const groups: Record<
      NonNullable<SessionMeta['kind']>,
      Array<SessionMeta>
    > = {
      chat: [],
      webchat: [],
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

  const selectedSessions = useMemo(
    () => deferredSessions.filter((session) => selectedSessionKeys.has(session.key)),
    [selectedSessionKeys, deferredSessions],
  )
  const selectedCount = selectedSessions.length

  const handleSelectionModeToggle = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedSessionKeys(new Set())
      }
      return !prev
    })
  }, [])

  const handleToggleSelect = useCallback((session: SessionMeta) => {
    if (isProtectedSession(session.key)) return
    setSelectedSessionKeys((prev) => {
      const next = new Set(prev)
      if (next.has(session.key)) {
        next.delete(session.key)
      } else {
        next.add(session.key)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedSessionKeys(
      new Set(
        deferredSessions
          .filter((session) => !isProtectedSession(session.key))
          .map((session) => session.key),
      ),
    )
  }, [deferredSessions])

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedSessionKeys(new Set())
  }, [])

  const handleDeleteSelected = useCallback(async () => {
    if (selectedSessions.length === 0) return
    const confirmed = window.confirm(
      `Delete ${selectedSessions.length} sessions? This will archive them.`,
    )
    if (!confirmed) return

    // Keep track of exactly which sessions fail so we can show actionable feedback.
    const failedSessionLabels: Array<string> = []

    await runWithConcurrency(
      selectedSessions,
      10,
      async (session) => {
        try {
          await deleteSessionRequest(session.key)
        } catch (err) {
          failedSessionLabels.push(
            session.label || session.title || session.derivedTitle || session.friendlyId,
          )
          throw err
        }
      },
    )

    if (failedSessionLabels.length > 0) {
      console.error('[sidebar] Bulk delete failed for some sessions', failedSessionLabels)
      window.alert(
        `Could not delete ${failedSessionLabels.length} session${failedSessionLabels.length !== 1 ? 's' : ''}:\n\n${failedSessionLabels.join('\n')}`,
      )
    }

    setSelectionMode(false)
    setSelectedSessionKeys(new Set())
    void queryClient.invalidateQueries({ queryKey: chatQueryKeys.sessions })
  }, [queryClient, selectedSessions])

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
              active={isSessionActive(session, activeFriendlyId, activeSessionKey)}
              isGenerating={isSessionGenerating(session, activeFriendlyId, activeSessionKey, isStreaming)}
              isPinned={false}
              selectionMode={selectionMode}
              selected={selectedSessionKeys.has(session.key)}
              onToggleSelect={handleToggleSelect}
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
      <div className="flex items-center justify-between pr-2 shrink-0">
        <CollapsibleTrigger className="w-fit pl-1.5 text-balance">
          Sessions
          <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="size-3 transition-transform duration-150 group-data-panel-open:rotate-90"
            />
          </span>
        </CollapsibleTrigger>
        <button
          type="button"
          onClick={handleSelectionModeToggle}
          className={cn(
            'text-[11px] font-medium px-1.5 py-0.5 rounded-md transition-colors',
            selectionMode
              ? 'text-primary-900 bg-primary-200'
              : 'text-primary-500 hover:text-primary-700 hover:bg-primary-100',
          )}
        >
          {selectionMode ? 'Done' : 'Select'}
        </button>
      </div>
      <CollapsiblePanel
        className="w-full flex-1 min-h-0 h-auto data-starting-style:h-0 data-ending-style:h-0"
        contentClassName="flex flex-1 min-h-0 flex-col overflow-y-auto"
      >
        <ScrollAreaRoot className="flex-1 min-h-0">
          <ScrollAreaViewport className="min-h-0">
            <div className="flex flex-col gap-2 pl-2 pr-2">
              {pinnedSessions.length > 0 ? (
                <div className="flex flex-col gap-px">
                  {pinnedSessions.map((session) => (
                    <SessionItem
                      key={session.key}
                      session={session}
                      active={isSessionActive(session, activeFriendlyId, activeSessionKey)}
                      isGenerating={isSessionGenerating(session, activeFriendlyId, activeSessionKey, isStreaming)}
                      isPinned
                      selectionMode={selectionMode}
                      selected={selectedSessionKeys.has(session.key)}
                      onToggleSelect={handleToggleSelect}
                      onSelect={onSelect}
                      onTogglePin={handleTogglePin}
                      onRename={onRename}
                      onDelete={onDelete}
                      onExport={onExport}
                    />
                  ))}
                </div>
              ) : null}
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
                        active={isSessionActive(session, activeFriendlyId, activeSessionKey)}
                        isGenerating={isSessionGenerating(session, activeFriendlyId, activeSessionKey, isStreaming)}
                        isPinned={false}
                        selectionMode={selectionMode}
                        selected={selectedSessionKeys.has(session.key)}
                        onToggleSelect={handleToggleSelect}
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
                'webchat',
                '🦎 OpenCami',
                groupedSessions.webchat,
              )}
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
      {selectionMode ? (
        <div className="shrink-0 border-t border-primary-200 bg-surface px-2 py-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary-600 font-medium">
              {selectedCount} selected
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-medium text-primary-600 hover:text-primary-800"
            >
              Select all
            </button>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedCount === 0}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                selectedCount > 0
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-primary-100 text-primary-400 cursor-not-allowed',
              )}
            >
              <HugeiconsIcon icon={Delete01Icon} size={14} strokeWidth={1.5} />
              Delete
            </button>
            <button
              type="button"
              onClick={handleCancelSelection}
              className="flex-1 inline-flex items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </Collapsible>
  )
}, areSidebarSessionsEqual)

function areSidebarSessionsEqual(
  prev: SidebarSessionsProps,
  next: SidebarSessionsProps,
) {
  if (prev.activeFriendlyId !== next.activeFriendlyId) return false
  if (prev.activeSessionKey !== next.activeSessionKey) return false
  if (prev.isStreaming !== next.isStreaming) return false
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
    if (prevSession.status !== nextSession.status) return false
    if (prevSession.lastMessage !== nextSession.lastMessage) return false
  }
  return true
}
