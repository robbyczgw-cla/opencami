import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SessionMeta, GatewayMessage, HistoryResponse } from '@/screens/chat/types'
import { chatQueryKeys } from '@/screens/chat/chat-queries'

export type SearchResult = {
  sessionKey: string
  friendlyId: string
  sessionTitle: string
  messageIndex: number
  messageRole: string
  messageText: string
  matchStart: number
  matchEnd: number
  timestamp?: number
}

type UseSearchOptions = {
  sessions: Array<SessionMeta>
  currentFriendlyId?: string
  currentSessionKey?: string
}

function extractTextFromContent(content: unknown): string {
  if (!Array.isArray(content)) return ''
  
  return content
    .map((item) => {
      if (item?.type === 'text' && typeof item.text === 'string') {
        return item.text
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
}

function extractTextFromMessage(message: GatewayMessage): string {
  // Try content array first
  const contentText = extractTextFromContent(message.content)
  if (contentText) return contentText
  
  // Fall back to direct text field if present
  if (typeof (message as any).text === 'string') {
    return (message as any).text
  }
  
  return ''
}

export function useSearch({ sessions, currentFriendlyId, currentSessionKey }: UseSearchOptions) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [globalResults, setGlobalResults] = useState<SearchResult[]>([])

  // Search within current conversation (uses cached history)
  const searchCurrentConversation = useCallback(
    (searchQuery: string): SearchResult[] => {
      if (!searchQuery.trim() || !currentFriendlyId || !currentSessionKey) {
        return []
      }

      const historyKey = chatQueryKeys.history(currentFriendlyId, currentSessionKey)
      const historyData = queryClient.getQueryData(historyKey) as HistoryResponse | undefined
      
      if (!historyData?.messages) return []

      const normalizedQuery = searchQuery.toLowerCase()
      const results: SearchResult[] = []
      
      const session = sessions.find(s => s.friendlyId === currentFriendlyId)
      const sessionTitle = session?.label || session?.title || session?.derivedTitle || currentFriendlyId

      historyData.messages.forEach((message, index) => {
        const text = extractTextFromMessage(message)
        if (!text) return

        const lowerText = text.toLowerCase()
        const matchIndex = lowerText.indexOf(normalizedQuery)
        
        if (matchIndex !== -1) {
          results.push({
            sessionKey: currentSessionKey,
            friendlyId: currentFriendlyId,
            sessionTitle,
            messageIndex: index,
            messageRole: message.role || 'unknown',
            messageText: text,
            matchStart: matchIndex,
            matchEnd: matchIndex + searchQuery.length,
            timestamp: message.timestamp,
          })
        }
      })

      return results
    },
    [currentFriendlyId, currentSessionKey, queryClient, sessions]
  )

  // Search across all sessions (fetches history for each)
  const searchAllSessions = useCallback(
    async (searchQuery: string): Promise<SearchResult[]> => {
      if (!searchQuery.trim()) {
        setGlobalResults([])
        return []
      }

      setIsSearching(true)
      const normalizedQuery = searchQuery.toLowerCase()
      const allResults: SearchResult[] = []

      try {
        // Search through all sessions
        await Promise.all(
          sessions.map(async (session) => {
            try {
              // Try to get from cache first
              const historyKey = chatQueryKeys.history(session.friendlyId, session.key)
              let historyData = queryClient.getQueryData(historyKey) as HistoryResponse | undefined

              // If not cached, fetch it
              if (!historyData) {
                const params = new URLSearchParams({
                  sessionKey: session.key,
                  friendlyId: session.friendlyId,
                  limit: '200',
                })
                const res = await fetch(`/api/history?${params.toString()}`)
                if (res.ok) {
                  historyData = await res.json() as HistoryResponse
                  // Cache it for later
                  queryClient.setQueryData(historyKey, historyData)
                }
              }

              if (!historyData?.messages) return

              const sessionTitle = session.label || session.title || session.derivedTitle || session.friendlyId

              historyData.messages.forEach((message, index) => {
                const text = extractTextFromMessage(message)
                if (!text) return

                const lowerText = text.toLowerCase()
                const matchIndex = lowerText.indexOf(normalizedQuery)

                if (matchIndex !== -1) {
                  allResults.push({
                    sessionKey: session.key,
                    friendlyId: session.friendlyId,
                    sessionTitle,
                    messageIndex: index,
                    messageRole: message.role || 'unknown',
                    messageText: text,
                    matchStart: matchIndex,
                    matchEnd: matchIndex + searchQuery.length,
                    timestamp: message.timestamp,
                  })
                }
              })
            } catch {
              // Skip sessions that fail to load
            }
          })
        )

        // Sort by timestamp (newest first)
        allResults.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        setGlobalResults(allResults)
        return allResults
      } finally {
        setIsSearching(false)
      }
    },
    [sessions, queryClient]
  )

  const clearSearch = useCallback(() => {
    setQuery('')
    setGlobalResults([])
  }, [])

  return {
    query,
    setQuery,
    isSearching,
    globalResults,
    searchCurrentConversation,
    searchAllSessions,
    clearSearch,
  }
}

/**
 * Highlights matched text in search results.
 * Returns the matched portion with surrounding context, or null if no match.
 */
export function highlightMatch(
  text: string,
  query: string,
): { before: string; match: string; after: string } | null {
  if (!query.trim()) return null

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const matchIndex = lowerText.indexOf(lowerQuery)

  if (matchIndex === -1) return null

  // Calculate context around the match
  const contextBefore = 40
  const contextAfter = 80
  
  let start = Math.max(0, matchIndex - contextBefore)
  let end = Math.min(text.length, matchIndex + query.length + contextAfter)

  // Adjust to word boundaries if possible
  if (start > 0) {
    const spaceIndex = text.indexOf(' ', start)
    if (spaceIndex !== -1 && spaceIndex < matchIndex) {
      start = spaceIndex + 1
    }
  }
  
  if (end < text.length) {
    const spaceIndex = text.lastIndexOf(' ', end)
    if (spaceIndex > matchIndex + query.length) {
      end = spaceIndex
    }
  }

  const before = (start > 0 ? '...' : '') + text.slice(start, matchIndex)
  const match = text.slice(matchIndex, matchIndex + query.length)
  const after = text.slice(matchIndex + query.length, end) + (end < text.length ? '...' : '')

  return { before, match, after }
}
