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
    localQuery,
    mode,
    searchAllSessions,
    searchCurrentConversation,
    clearSearch,
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
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          break
      }
    },
    [results, selectedIndex, handleSelectResult, onOpenChange],
  )

  const placeholder =
    mode === 'global'
      ? 'Search across all conversations...'
      : 'Search in this conversation...'

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(600px,92vw)] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-primary-200">
          <HugeiconsIcon
            icon={Search01Icon}
            size={20}
            className="text-primary-500 shrink-0"
          />
          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-primary-900 placeholder:text-primary-400 outline-none text-base"
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => {
                setLocalQuery('')
                clearSearch()
              }}
              className="p-1 hover:bg-primary-200 rounded transition-colors"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={16}
                className="text-primary-500"
              />
            </button>
          )}
          {isSearching && (
            <HugeiconsIcon
              icon={Loading03Icon}
              size={20}
              className="text-primary-500 animate-spin"
            />
          )}
        </div>

        <div ref={resultsRef} className="flex-1 overflow-y-auto p-2 min-h-0">
          {!localQuery.trim() ? (
            <div className="text-center text-primary-500 py-8 text-sm">
              {mode === 'global'
                ? 'Type to search across all your conversations'
                : 'Type to search within this conversation'}
            </div>
          ) : results.length === 0 && !isSearching ? (
            <div className="text-center text-primary-500 py-8 text-sm">
              No results found for "{localQuery}"
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {results.map((result, index) => (
                <SearchResultItem
                  key={`${result.friendlyId}-${result.messageIndex}`}
                  result={result}
                  query={localQuery}
                  isSelected={index === selectedIndex}
                  showSessionTitle={mode === 'global'}
                  onClick={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-primary-200 text-xs text-primary-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-primary-100 rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-primary-100 rounded text-[10px]">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-primary-100 rounded text-[10px]">Enter</kbd>
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-primary-100 rounded text-[10px]">Esc</kbd>
              to close
            </span>
          </div>
          <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}

type SearchResultItemProps = {
  result: SearchResult
  query: string
  isSelected: boolean
  showSessionTitle: boolean
  onClick: () => void
  onMouseEnter: () => void
}

function SearchResultItem({
  result,
  query,
  isSelected,
  showSessionTitle,
  onClick,
  onMouseEnter,
}: SearchResultItemProps) {
  const highlight = highlightMatch(result.messageText, query)

  return (
    <button
      type="button"
      data-selected={isSelected}
      className={cn(
        'w-full text-left px-3 py-2 rounded-lg transition-colors border',
        isSelected
          ? 'bg-primary-100 border-primary-300'
          : 'border-transparent hover:bg-primary-50',
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showSessionTitle && (
            <div className="text-xs font-medium text-primary-600 mb-1 truncate">
              {result.sessionTitle}
            </div>
          )}
          <div className="text-sm text-primary-900 line-clamp-2 break-words">
            {highlight ? (
              <>
                <span>{highlight.before}</span>
                <mark className="bg-yellow-200 text-inherit rounded px-0.5">
                  {highlight.match}
                </mark>
                <span>{highlight.after}</span>
              </>
            ) : (
              result.messageText
            )}
          </div>
          <div className="mt-1 text-xs text-primary-500 capitalize">
            {result.messageRole}
          </div>
        </div>
      </div>
    </button>
  )
}
