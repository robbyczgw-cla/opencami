import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { isMissingGatewayAuth } from '../utils'

type UseChatErrorStateInput = {
  error: string | null
  setError: (value: string | null) => void
  isRedirecting: boolean
  shouldRedirectToNew: boolean
  sessionsReady: boolean
  activeExists: boolean
  sessionsError: string | null
  historyError: string | null
  gatewayStatusError: string | null
}

export function useChatErrorState({
  error,
  setError,
  isRedirecting,
  shouldRedirectToNew,
  sessionsReady,
  activeExists,
  sessionsError,
  historyError,
  gatewayStatusError,
}: UseChatErrorStateInput) {
  const navigate = useNavigate()

  useEffect(() => {
    if (isRedirecting) {
      if (error) setError(null)
      return
    }
    if (shouldRedirectToNew) {
      if (error) setError(null)
      return
    }
    if (sessionsReady && !activeExists) {
      if (error) setError(null)
      return
    }
    const messageText = sessionsError ?? historyError ?? gatewayStatusError
    if (!messageText) {
      if (error?.startsWith('Failed to load')) {
        setError(null)
      }
      return
    }
    if (isMissingGatewayAuth(messageText)) {
      navigate({ to: '/connect', replace: true })
    }
    const message = sessionsError
      ? `Failed to load sessions. ${sessionsError}`
      : historyError
        ? `Failed to load history. ${historyError}`
        : gatewayStatusError
          ? `Gateway unavailable. ${gatewayStatusError}`
          : null
    if (message) setError(message)
  }, [
    activeExists,
    error,
    gatewayStatusError,
    historyError,
    isRedirecting,
    navigate,
    sessionsError,
    sessionsReady,
    setError,
    shouldRedirectToNew,
  ])
}
