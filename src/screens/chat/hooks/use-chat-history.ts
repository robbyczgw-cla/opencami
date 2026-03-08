import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useQuery } from '@tanstack/react-query'

import { chatQueryKeys, fetchHistory } from '../chat-queries'
import { getMessageTimestamp, textFromMessage } from '../utils'
import type { GatewayMessage, HistoryResponse } from '../types'
import type { QueryClient } from '@tanstack/react-query'

type UseChatHistoryInput = {
  activeFriendlyId: string
  activeSessionKey: string
  forcedSessionKey?: string
  isNewChat: boolean
  isRedirecting: boolean
  activeExists: boolean
  sessionsReady: boolean
  queryClient: QueryClient
}

type ScrollRestoreState = {
  scrollTop: number
  scrollHeight: number
}

const INITIAL_VISIBLE_MESSAGE_COUNT = 50
const HISTORY_PAGE_SIZE = 50

export function useChatHistory({
  activeFriendlyId,
  activeSessionKey,
  forcedSessionKey,
  isNewChat,
  isRedirecting,
  activeExists,
  sessionsReady,
  queryClient,
}: UseChatHistoryInput) {
  const sessionKeyForHistory =
    forcedSessionKey || activeSessionKey || activeFriendlyId
  const historyKey = chatQueryKeys.history(
    activeFriendlyId,
    sessionKeyForHistory,
  )
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MESSAGE_COUNT)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const pendingScrollRestoreRef = useRef<ScrollRestoreState | null>(null)

  const historyQuery = useQuery({
    queryKey: historyKey,
    queryFn: async function fetchHistoryForSession() {
      const cached = queryClient.getQueryData<HistoryResponse>(historyKey)
      const optimisticMessages = Array.isArray(cached?.messages)
        ? cached.messages.filter((message) => {
            if (message.status === 'sending') return true
            if (message.__optimisticId) return true
            return Boolean(message.clientId)
          })
        : []

      const serverData = await fetchHistory({
        sessionKey: sessionKeyForHistory,
        friendlyId: activeFriendlyId,
      })
      if (!optimisticMessages.length) return serverData

      const merged = mergeOptimisticHistoryMessages(
        serverData.messages,
        optimisticMessages,
      )

      return {
        ...serverData,
        messages: merged,
      }
    },
    enabled:
      !isNewChat &&
      Boolean(activeFriendlyId) &&
      !isRedirecting &&
      (!sessionsReady || activeExists),
    placeholderData: function useCachedHistory(): HistoryResponse | undefined {
      return queryClient.getQueryData(historyKey)
    },
    gcTime: 1000 * 60 * 10,
  })

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_MESSAGE_COUNT)
    setIsLoadingMore(false)
    pendingScrollRestoreRef.current = null
  }, [activeFriendlyId, historyKey, sessionKeyForHistory])

  useLayoutEffect(() => {
    if (isLoadingMore) return
    const pending = pendingScrollRestoreRef.current
    const viewport = scrollViewportRef.current
    if (!pending || !viewport) return

    const heightDelta = viewport.scrollHeight - pending.scrollHeight
    viewport.scrollTop = pending.scrollTop + Math.max(0, heightDelta)
    pendingScrollRestoreRef.current = null
  }, [historyQuery.data?.messages, isLoadingMore])

  const registerScrollViewport = useCallback((node: HTMLDivElement | null) => {
    scrollViewportRef.current = node
  }, [])

  const loadMore = useCallback(() => {
    if (isLoadingMore || historyQuery.isLoading) return

    const viewport = scrollViewportRef.current
    const totalMessages = Array.isArray(historyQuery.data?.messages)
      ? historyQuery.data.messages.length
      : 0
    if (visibleCount >= totalMessages) return

    pendingScrollRestoreRef.current = viewport
      ? {
          scrollTop: viewport.scrollTop,
          scrollHeight: viewport.scrollHeight,
        }
      : null

    setIsLoadingMore(true)
    setVisibleCount((currentCount) => {
      return Math.min(totalMessages, currentCount + HISTORY_PAGE_SIZE)
    })
    window.requestAnimationFrame(() => {
      setIsLoadingMore(false)
    })
  }, [
    historyQuery.data?.messages,
    historyQuery.isLoading,
    isLoadingMore,
    visibleCount,
  ])

  const stableHistorySignatureRef = useRef('')
  const stableHistoryMessagesRef = useRef<Array<GatewayMessage>>([])
  const historyMessages = useMemo(() => {
    const messages = Array.isArray(historyQuery.data?.messages)
      ? historyQuery.data.messages
      : []
    const last = messages.at(-1)
    const lastId = typeof last?.id === 'string' ? last.id : ''
    const lastText = last ? textFromMessage(last) : ''
    const signature = `${messages.length}:${last?.role ?? ''}:${lastId}:${lastText.slice(-32)}`
    if (signature === stableHistorySignatureRef.current) {
      return stableHistoryMessagesRef.current
    }
    stableHistorySignatureRef.current = signature
    stableHistoryMessagesRef.current = messages
    return messages
  }, [historyQuery.data?.messages])
  const displayMessages = useMemo(() => {
    if (visibleCount >= historyMessages.length) return historyMessages
    return historyMessages.slice(-visibleCount)
  }, [historyMessages, visibleCount])
  const hasMore = displayMessages.length < historyMessages.length

  const historyError =
    historyQuery.error instanceof Error ? historyQuery.error.message : null
  const resolvedSessionKey = useMemo(() => {
    if (forcedSessionKey) return forcedSessionKey
    const key = historyQuery.data?.sessionKey
    if (typeof key === 'string' && key.trim().length > 0) return key.trim()
    return activeSessionKey
  }, [activeSessionKey, forcedSessionKey, historyQuery.data?.sessionKey])
  const activeCanonicalKey = isNewChat
    ? 'new'
    : resolvedSessionKey || activeFriendlyId

  return {
    historyQuery,
    historyMessages,
    displayMessages,
    historyError,
    resolvedSessionKey,
    activeCanonicalKey,
    sessionKeyForHistory,
    hasMore,
    isLoadingMore,
    loadMore,
    registerScrollViewport,
    setVisibleCount,
  }
}

function mergeOptimisticHistoryMessages(
  serverMessages: Array<GatewayMessage>,
  optimisticMessages: Array<GatewayMessage>,
): Array<GatewayMessage> {
  if (!optimisticMessages.length) return serverMessages

  const merged = [...serverMessages]
  for (const optimisticMessage of optimisticMessages) {
    const hasMatch = serverMessages.some((serverMessage) => {
      if (
        optimisticMessage.clientId &&
        serverMessage.clientId &&
        optimisticMessage.clientId === serverMessage.clientId
      ) {
        return true
      }
      if (
        optimisticMessage.__optimisticId &&
        serverMessage.__optimisticId &&
        optimisticMessage.__optimisticId === serverMessage.__optimisticId
      ) {
        return true
      }
      if (optimisticMessage.role && serverMessage.role) {
        if (optimisticMessage.role !== serverMessage.role) return false
      }
      const optimisticText = textFromMessage(optimisticMessage)
      if (!optimisticText) return false
      if (optimisticText !== textFromMessage(serverMessage)) return false
      const optimisticTime = getMessageTimestamp(optimisticMessage)
      const serverTime = getMessageTimestamp(serverMessage)
      return Math.abs(optimisticTime - serverTime) <= 10000
    })

    if (!hasMatch) {
      merged.push(optimisticMessage)
    }
  }

  return merged
}
