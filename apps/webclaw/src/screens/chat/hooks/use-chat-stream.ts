import { useCallback, useEffect, useRef } from 'react'

import { getMessageTimestamp } from '../utils'
import {
  chatQueryKeys,
  updateHistoryMessages,
  updateSessionLastMessage,
} from '../chat-queries'
import type { QueryClient } from '@tanstack/react-query'
import type { GatewayMessage } from '../types'

type UseChatStreamInput = {
  activeFriendlyId: string
  isNewChat: boolean
  isRedirecting: boolean
  resolvedSessionKey: string
  sessionKeyForHistory: string
  queryClient: QueryClient
  refreshHistory: () => void
}

export function useChatStream({
  activeFriendlyId,
  isNewChat,
  isRedirecting,
  resolvedSessionKey,
  sessionKeyForHistory,
  queryClient,
  refreshHistory,
}: UseChatStreamInput) {
  const streamSourceRef = useRef<EventSource | null>(null)
  const streamReconnectTimer = useRef<number | null>(null)
  const streamReconnectAttempt = useRef(0)
  const refreshHistoryRef = useRef(refreshHistory)

  useEffect(() => {
    refreshHistoryRef.current = refreshHistory
  }, [refreshHistory])

  const stopStream = useCallback(() => {
    if (streamReconnectTimer.current) {
      window.clearTimeout(streamReconnectTimer.current)
      streamReconnectTimer.current = null
    }
    if (streamSourceRef.current) {
      streamSourceRef.current.close()
      streamSourceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!activeFriendlyId || isNewChat || isRedirecting) return
    let cancelled = false

    function startStream() {
      if (cancelled) return
      if (streamSourceRef.current) {
        streamSourceRef.current.close()
        streamSourceRef.current = null
      }
      const params = new URLSearchParams()
      const streamSessionKey = resolvedSessionKey || sessionKeyForHistory
      if (streamSessionKey) params.set('sessionKey', streamSessionKey)
      if (activeFriendlyId) params.set('friendlyId', activeFriendlyId)
      const source = new EventSource(`/api/stream?${params.toString()}`)
      streamSourceRef.current = source

      function handleStreamEvent(event: MessageEvent) {
        try {
          const parsed = JSON.parse(String(event.data || '{}')) as {
            event?: string
            payload?: unknown
          }
          if (parsed.event === 'chat.history') {
            const payload = parsed.payload as { messages?: Array<unknown> } | null
            if (payload && Array.isArray(payload.messages)) {
              queryClient.setQueryData(
                chatQueryKeys.history(activeFriendlyId, sessionKeyForHistory),
                {
                  sessionKey: sessionKeyForHistory,
                  messages: payload.messages,
                },
              )
              return
            }
            return
          }
          if (!parsed.event) return
          if (parsed.event === 'chat') {
            const payload = parsed.payload as
              | {
                  runId?: string
                  sessionKey?: string
                  state?: string
                  message?: GatewayMessage
                }
              | null
            if (payload?.message && typeof payload.message === 'object') {
              const payloadSessionKey = payload.sessionKey
              if (
                payloadSessionKey &&
                resolvedSessionKey &&
                payloadSessionKey !== resolvedSessionKey &&
                payloadSessionKey !== sessionKeyForHistory
              ) {
                return
              }
              const streamRunId =
                typeof payload.runId === 'string' ? payload.runId : ''
              const nextMessage = {
                ...payload.message,
                __streamRunId: streamRunId || undefined,
              }
              function upsert(messages: Array<GatewayMessage>) {
                if (streamRunId) {
                  const index = messages.findIndex(
                    (message) =>
                      (message as { __streamRunId?: string }).__streamRunId ===
                      streamRunId,
                  )
                  if (index >= 0) {
                    const next = [...messages]
                    next[index] = nextMessage
                    return next
                  }
                }
                if (nextMessage.role === 'assistant') {
                  const nextTime = getMessageTimestamp(nextMessage)
                  const index = [...messages]
                    .reverse()
                    .findIndex((message) => message.role === 'assistant')
                  if (index >= 0) {
                    const target = messages.length - 1 - index
                    const targetTime = getMessageTimestamp(messages[target])
                    if (Math.abs(nextTime - targetTime) <= 15000) {
                      const next = [...messages]
                      next[target] = nextMessage
                      return next
                    }
                  }
                }
                return [...messages, nextMessage]
              }

              updateHistoryMessages(
                queryClient,
                activeFriendlyId,
                sessionKeyForHistory,
                upsert,
              )
              if (payloadSessionKey && payloadSessionKey !== sessionKeyForHistory) {
                updateHistoryMessages(
                  queryClient,
                  activeFriendlyId,
                  payloadSessionKey,
                  upsert,
                )
              }
              if (payloadSessionKey) {
                updateSessionLastMessage(
                  queryClient,
                  payloadSessionKey,
                  activeFriendlyId,
                  nextMessage,
                )
              }
              if (
                payload.state === 'final' ||
                payload.state === 'error' ||
                payload.state === 'aborted'
              ) {
                refreshHistoryRef.current()
              }
            }
            return
          }
          if (!parsed.event.startsWith('chat.')) {
            return
          }
        } catch {
          // ignore parse errors
        }
      }

      function handleStreamOpen() {
        streamReconnectAttempt.current = 0
        refreshHistoryRef.current()
      }

      function handleStreamError() {
        if (cancelled) return
        if (streamReconnectTimer.current) return
        if (streamSourceRef.current) {
          streamSourceRef.current.close()
          streamSourceRef.current = null
        }
        streamReconnectAttempt.current += 1
        const backoff = Math.min(8000, 1000 * streamReconnectAttempt.current)
        streamReconnectTimer.current = window.setTimeout(() => {
          streamReconnectTimer.current = null
          startStream()
        }, backoff)
      }

      source.addEventListener('message', handleStreamEvent)
      source.addEventListener('open', handleStreamOpen)
      source.addEventListener('error', handleStreamError)
    }

    startStream()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [
    activeFriendlyId,
    isNewChat,
    isRedirecting,
    resolvedSessionKey,
    sessionKeyForHistory,
    stopStream,
  ])

  return { stopStream }
}
