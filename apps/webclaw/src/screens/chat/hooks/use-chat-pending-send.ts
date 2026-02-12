import { useEffect, useLayoutEffect, useRef } from 'react'
import { appendHistoryMessage, chatQueryKeys } from '../chat-queries'
import {
  consumePendingSend,
  hasPendingGeneration,
  hasPendingSend,
} from '../pending-send'
import type { QueryClient } from '@tanstack/react-query'

import type { AttachmentFile } from '@/components/attachment-button'
import type { HistoryResponse } from '../types'

type UseChatPendingSendInput = {
  activeFriendlyId: string
  activeSessionKey: string
  forcedSessionKey?: string
  isNewChat: boolean
  queryClient: QueryClient
  resolvedSessionKey: string
  setWaitingForResponse: (value: boolean) => void
  setPinToTop: (value: boolean) => void
  streamStop: () => void
  sendMessage: (
    sessionKey: string,
    friendlyId: string,
    body: string,
    skipOptimistic: boolean,
    attachments?: Array<AttachmentFile>,
  ) => void
}

export function useChatPendingSend({
  activeFriendlyId,
  activeSessionKey,
  forcedSessionKey,
  isNewChat,
  queryClient,
  resolvedSessionKey,
  setWaitingForResponse,
  setPinToTop,
  streamStop,
  sendMessage,
}: UseChatPendingSendInput) {
  const pendingStartRef = useRef(false)

  useEffect(() => {
    if (pendingStartRef.current) {
      pendingStartRef.current = false
      return
    }
    if (hasPendingSend() || hasPendingGeneration()) {
      setWaitingForResponse(true)
      setPinToTop(true)
      return
    }
    streamStop()
    setWaitingForResponse(false)
  }, [activeFriendlyId, isNewChat, setPinToTop, setWaitingForResponse, streamStop])

  useLayoutEffect(() => {
    if (isNewChat) return
    const pending = consumePendingSend(
      forcedSessionKey || resolvedSessionKey || activeSessionKey,
      activeFriendlyId,
    )
    if (!pending) return
    pendingStartRef.current = true
    const historyKey = chatQueryKeys.history(
      pending.friendlyId,
      pending.sessionKey,
    )
    const cached = queryClient.getQueryData<HistoryResponse>(historyKey)
    const cachedMessages = Array.isArray(cached?.messages)
      ? cached.messages
      : []
    const alreadyHasOptimistic = cachedMessages.some((message) => {
      if (pending.optimisticMessage.clientId) {
        if (message.clientId === pending.optimisticMessage.clientId) return true
        if (message.__optimisticId === pending.optimisticMessage.clientId)
          return true
      }
      if (pending.optimisticMessage.__optimisticId) {
        if (message.__optimisticId === pending.optimisticMessage.__optimisticId)
          return true
      }
      return false
    })
    if (!alreadyHasOptimistic) {
      appendHistoryMessage(
        queryClient,
        pending.friendlyId,
        pending.sessionKey,
        pending.optimisticMessage,
      )
    }
    setWaitingForResponse(true)
    setPinToTop(true)
    sendMessage(
      pending.sessionKey,
      pending.friendlyId,
      pending.message,
      true,
      pending.attachments,
    )
  }, [
    activeFriendlyId,
    activeSessionKey,
    forcedSessionKey,
    isNewChat,
    queryClient,
    resolvedSessionKey,
    sendMessage,
    setPinToTop,
    setWaitingForResponse,
  ])
}
