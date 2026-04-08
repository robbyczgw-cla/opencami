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
      const cachedMessages = Array.isArray(cached?.messages)
        ? cached.messages
        : []

      const serverData = await fetchHistory({
        sessionKey: sessionKeyForHistory,
        friendlyId: activeFriendlyId,
      })
      const dedupedServerMessages = dedupeHistoryMessages(serverData.messages)
      const serverMessages = restoreCachedImageParts(
        dedupedServerMessages,
        cachedMessages,
      )

      if (!optimisticMessages.length) {
        return { ...serverData, messages: serverMessages }
      }

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

function normalizeMessageIdValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getMessageIdentity(message: GatewayMessage): string {
  const id = normalizeMessageIdValue((message as { id?: unknown }).id)
  if (id) return `id:${id}`

  const clientId = normalizeMessageIdValue(message.clientId)
  if (clientId) return `client:${clientId}`

  const optimisticId = normalizeMessageIdValue(message.__optimisticId)
  if (optimisticId) return `optimistic:${optimisticId}`

  const toolCallId = normalizeMessageIdValue(message.toolCallId)
  if (message.role === 'toolResult' && toolCallId) {
    return `tool-result:${toolCallId}`
  }

  const timestampBucket = Math.floor(getMessageTimestamp(message) / 1000)
  const text = textFromMessage(message)
  if (text) {
    return `fallback:${message.role ?? 'unknown'}:${timestampBucket}:${text}`
  }

  return `fallback:${message.role ?? 'unknown'}:${timestampBucket}:${JSON.stringify(message.content ?? [])}`
}

export function dedupeHistoryMessages(
  messages: Array<GatewayMessage>,
): Array<GatewayMessage> {
  if (!Array.isArray(messages) || messages.length <= 1) return messages

  const deduped: Array<GatewayMessage> = []
  const seen = new Set<string>()

  for (const message of messages) {
    const identity = getMessageIdentity(message)
    if (seen.has(identity)) continue
    seen.add(identity)
    deduped.push(message)
  }

  return deduped
}

export function getImageParts(message: GatewayMessage): Array<unknown> {
  if (!Array.isArray(message.content)) return []
  return message.content.filter((part) => {
    if (typeof part !== 'object' || part === null) return false
    const p = part as Record<string, unknown>
    if (p.type !== 'image') return false
    const source = p.source as Record<string, unknown> | undefined
    return typeof source?.data === 'string' && source.data.length > 0
  })
}

export function restoreCachedImageParts(
  serverMessages: Array<GatewayMessage>,
  cachedMessages: Array<GatewayMessage>,
): Array<GatewayMessage> {
  const cachedMessagesWithImages = cachedMessages.filter(
    (message) => getImageParts(message).length > 0,
  )
  if (!cachedMessagesWithImages.length) return serverMessages

  return serverMessages.map((serverMessage) => {
    if (getImageParts(serverMessage).length > 0) return serverMessage

    const cachedMatch = cachedMessagesWithImages.find((cachedMessage) => {
      if (serverMessage.role !== cachedMessage.role) return false
      if (
        serverMessage.id &&
        cachedMessage.id &&
        serverMessage.id === cachedMessage.id
      ) {
        return true
      }
      if (
        serverMessage.clientId &&
        cachedMessage.clientId &&
        serverMessage.clientId === cachedMessage.clientId
      ) {
        return true
      }
      const serverText = textFromMessage(serverMessage)
      const cachedText = textFromMessage(cachedMessage)
      if (!serverText || serverText !== cachedText) return false
      const timeDiff = Math.abs(
        getMessageTimestamp(serverMessage) -
          getMessageTimestamp(cachedMessage),
      )
      return timeDiff <= 30000
    })

    if (!cachedMatch) return serverMessage
    const imageParts = getImageParts(cachedMatch)
    if (!imageParts.length) return serverMessage

    return {
      ...serverMessage,
      content: [
        ...imageParts,
        ...(Array.isArray(serverMessage.content) ? serverMessage.content : []),
      ] as typeof serverMessage.content,
    }
  })
}

export function mergeOptimisticHistoryMessages(
  serverMessages: Array<GatewayMessage>,
  optimisticMessages: Array<GatewayMessage>,
): Array<GatewayMessage> {
  if (!optimisticMessages.length) return serverMessages

  const merged = [...serverMessages]
  for (const optimisticMessage of optimisticMessages) {
    const matchIndex = findMatchIndex(merged, optimisticMessage)

    if (matchIndex === -1) {
      merged.push(optimisticMessage)
      continue
    }

    const imageParts = getImageParts(optimisticMessage)
    const serverMessage = merged[matchIndex]
    const serverImageParts = getImageParts(serverMessage)
    const needsImages = imageParts.length > 0 && serverImageParts.length === 0
    const needsOptimisticId = Boolean(
      optimisticMessage.__optimisticId && !serverMessage.__optimisticId,
    )
    const needsClientId = Boolean(
      optimisticMessage.clientId && !serverMessage.clientId,
    )

    if (!needsImages && !needsOptimisticId && !needsClientId) continue

    merged[matchIndex] = {
      ...serverMessage,
      ...(needsOptimisticId
        ? { __optimisticId: optimisticMessage.__optimisticId }
        : {}),
      ...(needsClientId
        ? { clientId: optimisticMessage.clientId }
        : {}),
      ...(needsImages
        ? {
            content: [
              ...imageParts,
              ...(Array.isArray(serverMessage.content)
                ? serverMessage.content
                : []),
            ] as typeof serverMessage.content,
          }
        : {}),
    }
  }

  return merged
}
