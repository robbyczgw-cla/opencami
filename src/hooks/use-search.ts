import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type {
  SessionMeta,
  GatewayMessage,
  HistoryResponse,
} from '@/screens/chat/types'
import { chatQueryKeys, fetchHistory } from '@/screens/chat/chat-queries'

const SEARCH_PAGE_SIZE = 200
const GLOBAL_SEARCH_THRESHOLD = 200
const MAX_HISTORY_PAGES = 20

export type SearchResult = {
  sessionKey: string
  friendlyId: string
  sessionTitle: string
  messageIndex: number
  messageId?: string
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
  const contentText = extractTextFromContent(message.content)
  if (contentText) return contentText

  if (typeof (message as any).text === 'string') {
    return (message as any).text
  }

  return ''
}

export function useSearch({
  sessions,
  currentFriendlyId,
  currentSessionKey,
}: UseSearchOptions) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [currentResults, setCurrentResults] = useState<SearchResult[]>([])
  const [globalResults, setGlobalResults] = useState<SearchResult[]>([])
  const currentSearchControllerRef = useRef<AbortController | null>(null)
  const globalSearchControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      currentSearchControllerRef.current?.abort()
      currentSearchControllerRef.current = null
      globalSearchControllerRef.current?.abort()
      globalSearchControllerRef.current = null
    }
  }, [])

  const searchCurrentConversation = useCallback(
    async (searchQuery: string): Promise<SearchResult[]> => {
      const trimmedQuery = searchQuery.trim()
      if (!trimmedQuery || !currentFriendlyId || !currentSessionKey) {
        currentSearchControllerRef.current?.abort()
        currentSearchControllerRef.current = null
        setCurrentResults([])
        return []
      }

      currentSearchControllerRef.current?.abort()
      const controller = new AbortController()
      currentSearchControllerRef.current = controller

      setIsSearching(true)
      setCurrentResults([])

      try {
        const session = sessions.find((item) => item.friendlyId === currentFriendlyId)
        const sessionTitle =
          session?.label ||
          session?.title ||
          session?.derivedTitle ||
          currentFriendlyId

        const historyData = await getSearchableHistory({
          friendlyId: currentFriendlyId,
          queryClient,
          sessionKey: currentSessionKey,
          signal: controller.signal,
          fetchAll: true,
        })

        const results = createSearchResults({
          messages: historyData.messages,
          normalizedQuery: trimmedQuery.toLowerCase(),
          searchQuery: trimmedQuery,
          sessionKey: currentSessionKey,
          friendlyId: currentFriendlyId,
          sessionTitle,
        })

        if (currentSearchControllerRef.current === controller) {
          setCurrentResults(results)
        }

        return results
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return []
        }
        throw error
      } finally {
        if (currentSearchControllerRef.current === controller) {
          currentSearchControllerRef.current = null
          setIsSearching(false)
        }
      }
    },
    [currentFriendlyId, currentSessionKey, queryClient, sessions],
  )

  const searchAllSessions = useCallback(
    async (searchQuery: string): Promise<SearchResult[]> => {
      const trimmedQuery = searchQuery.trim()
      if (!trimmedQuery) {
        globalSearchControllerRef.current?.abort()
        globalSearchControllerRef.current = null
        setGlobalResults([])
        return []
      }

      globalSearchControllerRef.current?.abort()
      const controller = new AbortController()
      globalSearchControllerRef.current = controller

      setIsSearching(true)
      setGlobalResults([])

      const normalizedQuery = trimmedQuery.toLowerCase()
      const allResults: SearchResult[] = []
      const batchSize = 10

      try {
        for (let index = 0; index < sessions.length; index += batchSize) {
          if (controller.signal.aborted) {
            throw new DOMException('Search aborted', 'AbortError')
          }

          const batch = sessions.slice(index, index + batchSize)
          const batchSettled = await Promise.allSettled(
            batch.map(async (session) => {
              const historyData = await getSearchableHistory({
                friendlyId: session.friendlyId,
                minMessages: GLOBAL_SEARCH_THRESHOLD,
                queryClient,
                sessionKey: session.key,
                signal: controller.signal,
              })

              const sessionTitle =
                session.label ||
                session.title ||
                session.derivedTitle ||
                session.friendlyId

              return createSearchResults({
                messages: historyData.messages,
                normalizedQuery,
                searchQuery: trimmedQuery,
                sessionKey: session.key,
                friendlyId: session.friendlyId,
                sessionTitle,
              })
            }),
          )

          for (const result of batchSettled) {
            if (result.status === 'fulfilled') {
              allResults.push(...result.value)
            }
          }

          allResults.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          setGlobalResults([...allResults])
        }

        return allResults
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return []
        }
        throw error
      } finally {
        if (globalSearchControllerRef.current === controller) {
          globalSearchControllerRef.current = null
          setIsSearching(false)
        }
      }
    },
    [sessions, queryClient],
  )

  const clearSearch = useCallback(() => {
    currentSearchControllerRef.current?.abort()
    currentSearchControllerRef.current = null
    globalSearchControllerRef.current?.abort()
    globalSearchControllerRef.current = null
    setIsSearching(false)
    setQuery('')
    setCurrentResults([])
    setGlobalResults([])
  }, [])

  return {
    query,
    setQuery,
    isSearching,
    currentResults,
    globalResults,
    searchCurrentConversation,
    searchAllSessions,
    clearSearch,
  }
}

function createSearchResults({
  messages,
  normalizedQuery,
  searchQuery,
  sessionKey,
  friendlyId,
  sessionTitle,
}: {
  messages: Array<GatewayMessage>
  normalizedQuery: string
  searchQuery: string
  sessionKey: string
  friendlyId: string
  sessionTitle: string
}): SearchResult[] {
  const results: SearchResult[] = []

  messages.forEach((message, index) => {
    const text = extractTextFromMessage(message)
    if (!text) return

    const lowerText = text.toLowerCase()
    const matchIndex = lowerText.indexOf(normalizedQuery)
    if (matchIndex === -1) return

    results.push({
      sessionKey,
      friendlyId,
      sessionTitle,
      messageIndex: index,
      messageId: typeof message.id === 'string' ? message.id : undefined,
      messageRole: message.role || 'unknown',
      messageText: text,
      matchStart: matchIndex,
      matchEnd: matchIndex + searchQuery.length,
      timestamp: message.timestamp,
    })
  })

  return results
}

async function getSearchableHistory({
  friendlyId,
  minMessages,
  queryClient,
  sessionKey,
  signal,
  fetchAll = false,
}: {
  friendlyId: string
  minMessages?: number
  queryClient: QueryClient
  sessionKey: string
  signal: AbortSignal
  fetchAll?: boolean
}): Promise<HistoryResponse> {
  const historyKey = chatQueryKeys.history(friendlyId, sessionKey)
  const cached = queryClient.getQueryData(historyKey) as HistoryResponse | undefined
  const optimisticMessages = getOptimisticMessages(cached?.messages)
  const cachedServerMessages = getServerMessages(cached?.messages)
  const cachedHasMore = cached?.hasMore ?? false

  if (
    hasSufficientCachedHistory(
      cachedServerMessages,
      cachedHasMore,
      fetchAll,
      minMessages,
    )
  ) {
    return {
      sessionKey: cached?.sessionKey || sessionKey,
      sessionId: cached?.sessionId,
      messages: optimisticMessages.length
        ? mergeOptimisticHistoryMessages(cachedServerMessages, optimisticMessages)
        : cachedServerMessages,
      hasMore: cachedHasMore,
    }
  }

  const fetched = fetchAll
    ? await fetchEntireHistory({ friendlyId, sessionKey, signal })
    : await fetchHistory({
        sessionKey,
        friendlyId,
        limit: Math.max(
          minMessages ?? GLOBAL_SEARCH_THRESHOLD,
          GLOBAL_SEARCH_THRESHOLD,
        ),
      })

  if (signal.aborted) {
    throw new DOMException('Search aborted', 'AbortError')
  }

  const mergedMessages = optimisticMessages.length
    ? mergeOptimisticHistoryMessages(fetched.messages, optimisticMessages)
    : fetched.messages

  const nextData = {
    sessionKey: fetched.sessionKey || cached?.sessionKey || sessionKey,
    sessionId: fetched.sessionId ?? cached?.sessionId,
    messages: mergedMessages,
    hasMore: fetched.hasMore ?? false,
  } satisfies HistoryResponse

  queryClient.setQueryData(historyKey, nextData)

  return nextData
}

export function hasSufficientCachedHistory(
  cachedServerMessages: Array<GatewayMessage>,
  cachedHasMore: boolean,
  fetchAll: boolean,
  minMessages?: number,
): boolean {
  if (cachedServerMessages.length === 0) return false
  const threshold = minMessages ?? GLOBAL_SEARCH_THRESHOLD
  if (fetchAll) {
    // If we know there's no more history (hasMore=false), the cache is complete regardless of size
    if (!cachedHasMore) return true
    // Otherwise need enough messages to be confident
    return cachedServerMessages.length >= threshold
  }
  if (cachedServerMessages.length >= threshold) {
    return true
  }
  return !cachedHasMore
}

export async function fetchEntireHistory({
  friendlyId,
  sessionKey,
  signal,
}: {
  friendlyId: string
  sessionKey: string
  signal: AbortSignal
}): Promise<HistoryResponse> {
  let accumulated: Array<GatewayMessage> = []
  let sessionId: string | undefined
  let responseSessionKey = sessionKey
  let before: string | undefined
  let hasMore = false
  let iterations = 0

  do {
    const previousLength = accumulated.length
    const previousBefore = before
    const page = await fetchHistory({
      sessionKey,
      friendlyId,
      limit: SEARCH_PAGE_SIZE,
      before,
      signal,
    })

    if (signal.aborted) {
      throw new DOMException('Search aborted', 'AbortError')
    }

    responseSessionKey = page.sessionKey || responseSessionKey
    sessionId = page.sessionId ?? sessionId
    accumulated = dedupeMessages(page.messages, accumulated)
    hasMore = page.hasMore ?? false
    before = getOldestHistoryCursor(accumulated)
    iterations += 1

    const didGrow = accumulated.length > previousLength
    const cursorStalled =
      typeof previousBefore === 'string' &&
      previousBefore.length > 0 &&
      previousBefore === before

    if (!didGrow || cursorStalled || iterations >= MAX_HISTORY_PAGES) {
      hasMore = false
      break
    }
  } while (hasMore && before)

  return {
    sessionKey: responseSessionKey,
    sessionId,
    messages: accumulated,
    hasMore,
  }
}

function getOptimisticMessages(
  messages: Array<GatewayMessage> | undefined,
): Array<GatewayMessage> {
  if (!Array.isArray(messages)) return []
  return messages.filter((message) => isOptimisticMessage(message))
}

function getServerMessages(
  messages: Array<GatewayMessage> | undefined,
): Array<GatewayMessage> {
  if (!Array.isArray(messages)) return []
  return messages.filter((message) => !isOptimisticMessage(message))
}

function isOptimisticMessage(message: GatewayMessage): boolean {
  if (message.status === 'sending') return true
  if (message.__optimisticId) return true
  return Boolean(message.clientId)
}

function mergeOptimisticHistoryMessages(
  serverMessages: Array<GatewayMessage>,
  optimisticMessages: Array<GatewayMessage>,
): Array<GatewayMessage> {
  return dedupeMessages(serverMessages, optimisticMessages)
}

function getOldestHistoryCursor(
  messages: Array<GatewayMessage>,
): string | undefined {
  const oldestMessage = messages.find((message) => !isOptimisticMessage(message))
  if (!oldestMessage) return undefined
  if (typeof oldestMessage.id === 'string' && oldestMessage.id.trim().length > 0) {
    return oldestMessage.id.trim()
  }
  return undefined
}

function dedupeMessages(...chunks: Array<Array<GatewayMessage>>): Array<GatewayMessage> {
  const merged: Array<GatewayMessage> = []
  const seen = new Set<string>()

  for (const chunk of chunks) {
    for (const message of chunk) {
      const key = messageIdentity(message)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(message)
    }
  }

  return merged
}

function messageIdentity(message: GatewayMessage): string {
  if (typeof message.id === 'string' && message.id.length > 0) {
    return `id:${message.id}`
  }
  if (typeof message.clientId === 'string' && message.clientId.length > 0) {
    return `client:${message.clientId}`
  }
  if (
    typeof message.__optimisticId === 'string' &&
    message.__optimisticId.length > 0
  ) {
    return `optimistic:${message.__optimisticId}`
  }
  return [
    message.role ?? '',
    message.timestamp ?? '',
    extractTextFromMessage(message),
  ].join('|')
}

export function highlightMatch(
  text: string,
  query: string,
): { before: string; match: string; after: string } | null {
  if (!query.trim()) return null

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const matchIndex = lowerText.indexOf(lowerQuery)

  if (matchIndex === -1) return null

  const contextBefore = 40
  const contextAfter = 80

  let start = Math.max(0, matchIndex - contextBefore)
  let end = Math.min(text.length, matchIndex + query.length + contextAfter)

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
  const after =
    text.slice(matchIndex + query.length, end) +
    (end < text.length ? '...' : '')

  return { before, match, after }
}
