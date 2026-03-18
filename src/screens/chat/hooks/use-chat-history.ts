import { useMemo, useRef } from 'react'
import { useQuery, type QueryClient } from '@tanstack/react-query'

import { chatQueryKeys, fetchHistory } from '../chat-queries'
import { getMessageTimestamp, textFromMessage } from '../utils'
import type { GatewayMessage, HistoryResponse } from '../types'

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
  const historyQuery = useQuery({
    queryKey: historyKey,
    queryFn: async function fetchHistoryForSession() {
      const cached = queryClient.getQueryData(historyKey) as
        | HistoryResponse
        | undefined
      const optimisticMessages = Array.isArray(cached?.messages)
        ? cached.messages.filter((message) => {
            if (message.status === 'sending') return true
            if (message.__optimisticId) return true
            return Boolean(message.clientId)
          })
        : []

      // Capture all cached messages (including non-optimistic) with image parts
      // before fetching, so we can restore them after the server response
      const cachedMessages = Array.isArray(cached?.messages) ? cached.messages : []
      const cachedMessagesWithImages = cachedMessages.filter((m) => {
        if (!Array.isArray(m.content)) return false
        return m.content.some(
          (part) =>
            typeof part === 'object' &&
            part !== null &&
            (part as Record<string, unknown>).type === 'image',
        )
      })

      const serverData = await fetchHistory({
        sessionKey: sessionKeyForHistory,
        friendlyId: activeFriendlyId,
      })

      // Restore images from cache into server messages that lost them
      let serverMessages = serverData.messages
      if (cachedMessagesWithImages.length > 0) {
        serverMessages = serverData.messages.map((serverMsg) => {
          const hasImages =
            Array.isArray(serverMsg.content) &&
            serverMsg.content.some(
              (p) =>
                typeof p === 'object' &&
                p !== null &&
                (p as Record<string, unknown>).type === 'image',
            )
          if (hasImages) return serverMsg

          // Try to find a matching cached message with images
          const cachedMatch = cachedMessagesWithImages.find((cachedMsg) => {
            if (serverMsg.role !== cachedMsg.role) return false
            if (serverMsg.id && cachedMsg.id && serverMsg.id === cachedMsg.id) return true
            if (serverMsg.clientId && cachedMsg.clientId && serverMsg.clientId === cachedMsg.clientId) return true
            const serverText = textFromMessage(serverMsg)
            const cachedText = textFromMessage(cachedMsg)
            if (!serverText || serverText !== cachedText) return false
            const timeDiff = Math.abs(getMessageTimestamp(serverMsg) - getMessageTimestamp(cachedMsg))
            return timeDiff <= 30000
          })

          if (!cachedMatch || !Array.isArray(cachedMatch.content)) return serverMsg
          const imageParts = cachedMatch.content.filter(
            (p) =>
              typeof p === 'object' &&
              p !== null &&
              (p as Record<string, unknown>).type === 'image',
          )
          if (imageParts.length === 0) return serverMsg
          return {
            ...serverMsg,
            content: [...imageParts, ...(Array.isArray(serverMsg.content) ? serverMsg.content : [])] as typeof serverMsg.content,
          }
        })
      }

      if (!optimisticMessages.length) return { ...serverData, messages: serverMessages }

      const merged = mergeOptimisticHistoryMessages(
        serverMessages,
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
  }
}

function findMatchIndex(
  serverMessages: Array<GatewayMessage>,
  optimisticMessage: GatewayMessage,
): number {
  return serverMessages.findIndex((serverMessage) => {
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
}

function getImageParts(message: GatewayMessage): Array<unknown> {
  if (!Array.isArray(message.content)) return []
  return message.content.filter((part) => {
    if (typeof part !== 'object' || part === null) return false
    const p = part as Record<string, unknown>
    if (p.type !== 'image') return false
    // Only count images that actually have renderable data (base64 bytes)
    const source = p.source as Record<string, unknown> | undefined
    return typeof source?.data === 'string' && source.data.length > 0
  })
}

function mergeOptimisticHistoryMessages(
  serverMessages: Array<GatewayMessage>,
  optimisticMessages: Array<GatewayMessage>,
): Array<GatewayMessage> {
  if (!optimisticMessages.length) return serverMessages

  const merged = [...serverMessages]
  for (const optimisticMessage of optimisticMessages) {
    const matchIndex = findMatchIndex(merged, optimisticMessage)

    if (matchIndex === -1) {
      merged.push(optimisticMessage)
    } else {
      // Preserve image parts from optimistic message if server message lost them.
      // Also preserve __optimisticId/clientId so subsequent refetches keep merging correctly.
      const imageParts = getImageParts(optimisticMessage)
      const serverMessage = merged[matchIndex]
      const serverImageParts = getImageParts(serverMessage)
      const needsImages = imageParts.length > 0 && serverImageParts.length === 0
      const needsMarkers =
        optimisticMessage.__optimisticId && !serverMessage.__optimisticId

      if ((needsImages || needsMarkers) && Array.isArray(serverMessage.content)) {
        merged[matchIndex] = {
          ...serverMessage,
          ...(needsMarkers
            ? {
                __optimisticId: optimisticMessage.__optimisticId,
                clientId: serverMessage.clientId ?? optimisticMessage.clientId,
              }
            : {}),
          content: needsImages
            ? ([...imageParts, ...serverMessage.content] as typeof serverMessage.content)
            : serverMessage.content,
        }
      }
    }
  }

  return merged
}
