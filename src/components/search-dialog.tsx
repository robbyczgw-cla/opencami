'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Cancel01Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons'
import { DialogRoot, DialogContent } from './ui/dialog'
import { useSearch, highlightMatch, type SearchResult } from '@/hooks/use-search'
import type { SessionMeta } from '@/screens/chat/types'
import { cn } from '@/lib/utils'

type SearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessions: Array<SessionMeta>
  currentFriendlyId?: string
  currentSessionKey?: string
  mode: 'global' | 'current'
  onJumpToMessage?: (result: SearchResult) => void
}

const SEARCH_JUMP_TARGET_KEY = 'opencami-search-jump-target'

export function SearchDialog({
  open,
  onOpenChange,
  sessions,
  currentFriendlyId,
  currentSessionKey,
  mode,
  onJumpToMessage,
}: SearchDialogProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localQuery, setLocalQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)

  const {
    isSearching,
    currentResults,
    globalResults,
    searchCurrentConversation,
    searchAllSessions,
    clearSearch,
  } = useSearch({
    sessions,
    currentFriendlyId,
    currentSessionKey,
  })

  const results = mode === 'global' ? globalResults : currentResults

  useEffect(() => {
    if (!localQuery.trim()) {
      clearSearch()
      return
    }

    const timer = window.setTimeout(() => {
      if (mode === 'global') {
        void searchAllSessions(localQuery)
        return
      }
      void searchCurrentConversation(localQuery)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [
    clearSearch,
    localQuery,
    mode,
    searchAllSessions,
    searchCurrentConversation,
  ])

  useEffect(() => {
    if (!open) {
      clearSearch()
      return
    }

    setLocalQuery('')
    setSelectedIndex(0)
    clearSearch()
    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }, [open, clearSearch])

  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  useEffect(() => {
    if (!resultsRef.current) return
    const selected = resultsRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      onOpenChange(false)

      if (mode === 'current' && onJumpToMessage) {
        onJumpToMessage(result)
      } else {
        if (result.messageId && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(
              SEARCH_JUMP_TARGET_KEY,
              JSON.stringify({
                friendlyId: result.friendlyId,
                messageId: result.messageId,
                at: Date.now(),
              }),
            )
          } catch {
            // Ignore storage errors.
          }
        }

        navigate({
          to: '/chat/$sessionKey',
          params: { sessionKey: result.friendlyId },
        })
      }
    },
    [mode, navigate, onJumpToMessage, onOpenChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (results.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const result = results[selectedIndex]
        if (result) handleSelectResult(result)
      }
    },
    [handleSelectResult, results, selectedIndex],
  )

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <HugeiconsIcon icon={Search01Icon} className="size-5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'global'
                ? 'Search all conversations...'
                : 'Search this conversation...'
            }
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {isSearching ? (
            <HugeiconsIcon icon={Loading03Icon} className="size-5 text-muted-foreground animate-spin" />
          ) : localQuery ? (
            <button
              type="button"
              onClick={() => setLocalQuery('')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
            </button>
          ) : null}
        </div>

        <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto p-2">
          {localQuery.trim() && results.length === 0 && !isSearching ? (
            <div className="px-3 py-8 text-sm text-center text-muted-foreground">
              No results found
            </div>
          ) : (
            results.map((result, index) => {
              const highlighted = highlightMatch(result.messageText, localQuery)
              return (
                <button
                  key={`${result.sessionKey}-${result.messageId || result.messageIndex}`}
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  data-selected={index === selectedIndex}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg transition-colors',
                    index === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50',
                  )}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-sm font-medium truncate">{result.sessionTitle}</div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {result.messageRole}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2 break-words">
                    {highlighted ? (
                      <>
                        {highlighted.before}
                        <mark className="bg-yellow-200/80 text-foreground rounded px-0.5">
                          {highlighted.match}
                        </mark>
                        {highlighted.after}
                      </>
                    ) : (
                      result.messageText
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
