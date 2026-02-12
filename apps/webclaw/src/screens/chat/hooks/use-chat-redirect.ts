import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { clearHistoryMessages } from '../chat-queries'
import { resetPendingSend } from '../pending-send'
import type { QueryClient } from '@tanstack/react-query'

type UseChatRedirectInput = {
  activeFriendlyId: string
  isNewChat: boolean
  isRedirecting: boolean
  shouldRedirectToNew: boolean
  sessionsReady: boolean
  sessionsCount: number
  sessionKeyForHistory: string
  queryClient: QueryClient
  setIsRedirecting: (value: boolean) => void
}

export function useChatRedirect({
  activeFriendlyId,
  isNewChat,
  isRedirecting,
  shouldRedirectToNew,
  sessionsReady,
  sessionsCount,
  sessionKeyForHistory,
  queryClient,
  setIsRedirecting,
}: UseChatRedirectInput) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isRedirecting) return
    if (isNewChat) {
      setIsRedirecting(false)
      return
    }
    if (!shouldRedirectToNew && sessionsReady) {
      setIsRedirecting(false)
    }
  }, [isNewChat, isRedirecting, sessionsReady, setIsRedirecting, shouldRedirectToNew])

  useEffect(() => {
    if (isNewChat) return
    if (!sessionsReady) return
    if (sessionsCount === 0) return
    if (!shouldRedirectToNew) return
    resetPendingSend()
    clearHistoryMessages(queryClient, activeFriendlyId, sessionKeyForHistory)
    navigate({ to: '/new', replace: true })
  }, [
    activeFriendlyId,
    isNewChat,
    navigate,
    queryClient,
    sessionKeyForHistory,
    sessionsCount,
    sessionsReady,
    shouldRedirectToNew,
  ])
}
