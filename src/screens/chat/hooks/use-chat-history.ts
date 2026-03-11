import { useCallback, useMemo, useRef, useState } from 'react'
import { useQuery, type QueryClient } from '@tanstack/react-query'

import { chatQueryKeys, fetchHistory } from '../chat-queries'
import { getMessageTimestamp, textFromMessage } from '../utils'
import type { GatewayMessage, HistoryResponse } from '../types'

const PAGE_SIZE = 50

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

  const limitRef = useRef(PAGE_SIZE)
  const hasMoreRef = useRef(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const prevSessionRef = useRef(sessionKeyForHistory)
  if (prevSessionRef.current !== sessionKeyForHistory) {
    prevSessionRef.current = sessionKeyForHistory
    limitRef.current = PAGE_SIZE
    hasMoreRef.current = false
    if (isLoadingMore) {
      setIsLoadingMore(false)
    }
  }

  const historyQuery = useQuery({
    queryKey: historyKey,
    queryFn: async function fetchHistoryForSession() {
      const cached = queryClient.getQueryData(historyKey) as
        | HistoryResponse
        | undefined
      const optimisticMessages = getOptimisticMessages(cached?.messages)
      const cachedServerMessages = getServerMessages(cached?.messages)

      const serverData = await fetchHistory({
        sessionKey: sessionKeyForHistory,
        friendlyId: activeFriendlyId,
        limit: limitRef.current,
      })

      const mergedServerMessages = dedupeMessages(
        serverData.messages,
        cachedServerMessages,
      )
      const hasNewMessages = mergedServerMessages.length > cachedServerMessages.length
      hasMoreRef.current =
        isLoadingMore && !hasNewMessages
          ? false
          : (serverData.hasMore ?? false)

      if (!optimisticMessages.length) {
        return {
          ...serverData,
          messages: mergedServerMessages,
          hasMore: hasMoreRef.current,
        }
      }

      return {
        ...serverData,
        messages: mergeOptimisticHistoryMessages(
          mergedServerMessages,
          optimisticMessages,
        ),
        hasMore: hasMoreRef.current,
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

  const loadMore = useCallback(async () => {
    if (isLoadingMore || historyQuery.isFetching) return
    setIsLoadingMore(true)
    limitRef.current += PAGE_SIZE * 3
    try {
      await historyQuery.refetch()
    } finally {
      setIsLoadingMore(false)
    }
  }, [historyQuery, isLoadingMore])

  const stableHistorySignatureRef = useRef('')
  const stableHistoryMessagesRef = useRef<Array<GatewayMessage>>([])
  const historyMessages = useMemo(() => {
    const messages = Array.isArray(historyQuery.data?.messages)
      ? historyQuery.data.messages
      : []
    const last = messages[messages.length - 1]
    const lastId =
      last && typeof (last as { id?: string }).id === 'string'
        ? (last as { id?: string }).id
        : ''
    const signature = `${messages.length}:${last?.role ?? ''}:${lastId}:${textFromMessage(last ?? { role: 'user', content: [] }).slice(-32)}`
    if (signature === stableHistorySignatureRef.current) {
      return stableHistoryMessagesRef.current
    }
    stableHistorySignatureRef.current = signature
    stableHistoryMessagesRef.current = messages
    return messages
  }, [historyQuery.data?.messages])

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
    displayMessages: historyMessages,
    historyError,
    resolvedSessionKey,
    activeCanonicalKey,
    sessionKeyForHistory,
    hasMore: hasMoreRef.current,
    isLoadingMore,
    loadMore,
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
    textFromMessage(message),
  ].join('|')
}
