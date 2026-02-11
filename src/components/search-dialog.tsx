'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon, Cancel01Icon, Loading03Icon } from '@hugeicons/core-free-icons'
import {
  DialogRoot,
  DialogContent,
} from './ui/dialog'
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
    globalResults,
    searchCurrentConversation,
    searchAllSessions,
    clearSearch,
  } = useSearch({
    sessions,
    currentFriendlyId,
    currentSessionKey,
  })

  // For current conversation search, compute results synchronously
  const currentResults = useMemo(() => {
    if (mode !== 'current') return []
    return searchCurrentConversation(localQuery)
  }, [mode, localQuery, searchCurrentConversation])

  const results = mode === 'global' ? globalResults : currentResults

  // Debounced global search
  useEffect(() => {
    if (mode !== 'global') return
    if (!localQuery.trim()) {
      clearSearch()
      return
    }

    const timer = setTimeout(() => {
      void searchAllSessions(localQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [localQuery, mode, searchAllSessions, clearSearch])

  // Focus input when dialog opens and cancel active search when it closes
  useEffect(() => {
    if (!open) {
      clearSearch()
      return
    }

    setLocalQuery('')
    setSelectedIndex(0)
    clearSearch()
    // Small delay to ensure dialog is mounted
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }, [open, clearSearch])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Scroll selected item into view
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
        // Persist jump target so chat screen can scroll/highlight after navigation.
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

        // Navigate to the conversation
        navigate({
          to: '/chat/$sessionKey',
          params: { sessionKey: result.friendlyId },
        })
      }
    },
    [mode, navigate, onJumpToMessage, onOpenChange]
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
    [results, selectedIndex, handleSelectResult, onOpenChange]
  )

  const placeholder = mode === 'global' 
    ? 'Search across all conversations...' 
    : 'Search in this conversation...'

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(600px,92vw)] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Search input */}
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

        {/* Results */}
        <div
          ref={resultsRef}
          className="flex-1 overflow-y-auto p-2 min-h-0"
        >
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

        {/* Footer with keyboard hints */}
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
          {results.length > 0 && (
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          )}
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
  const roleLabel = result.messageRole === 'assistant' ? 'Assistant' : 'You'

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      data-selected={isSelected}
      className={cn(
        'w-full text-left px-3 py-2 rounded-lg transition-colors',
        isSelected
          ? 'bg-primary-200'
          : 'hover:bg-primary-100'
      )}
    >
      {showSessionTitle && (
        <div className="text-xs font-medium text-primary-600 mb-1 truncate">
          {result.sessionTitle}
        </div>
      )}
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded',
            result.messageRole === 'assistant'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          )}
        >
          {roleLabel}
        </span>
      </div>
      {highlight && (
        <div className="text-sm text-primary-700 line-clamp-2">
          <span>{highlight.before}</span>
          <mark className="bg-yellow-200 text-primary-900 rounded px-0.5">
            {highlight.match}
          </mark>
          <span>{highlight.after}</span>
        </div>
      )}
    </button>
  )
}
