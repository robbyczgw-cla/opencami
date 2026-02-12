import { useEffect, useRef } from 'react'

import { getMessageTimestamp } from '../utils'
import { setPendingGeneration } from '../pending-send'
import type { GatewayMessage } from '../types'

type UseChatGenerationGuardInput = {
  waitingForResponse: boolean
  historyMessages: Array<GatewayMessage>
  streamStop: () => void
  refreshHistory: () => void
  setWaitingForResponse: (value: boolean) => void
  setPinToTop: (value: boolean) => void
}

export function useChatGenerationGuard({
  waitingForResponse,
  historyMessages,
  streamStop,
  refreshHistory,
  setWaitingForResponse,
  setPinToTop,
}: UseChatGenerationGuardInput) {
  const timeoutTimer = useRef<number | null>(null)
  const waitingRef = useRef(waitingForResponse)

  function finish() {
    streamStop()
    setPendingGeneration(false)
    setWaitingForResponse(false)
  }

  useEffect(() => {
    waitingRef.current = waitingForResponse
  }, [waitingForResponse])

  useEffect(() => {
    if (!waitingForResponse) {
      if (timeoutTimer.current) {
        window.clearTimeout(timeoutTimer.current)
        timeoutTimer.current = null
      }
      return
    }

    const lastAssistant = [...historyMessages]
      .reverse()
      .find((message) => message.role === 'assistant')
    const lastUser = [...historyMessages]
      .reverse()
      .find((message) => message.role === 'user')
    const assistantTime = lastAssistant ? getMessageTimestamp(lastAssistant) : 0
    const userTime = lastUser ? getMessageTimestamp(lastUser) : 0
    if (assistantTime > userTime) {
      finish()
      return
    }

    if (!timeoutTimer.current) {
      timeoutTimer.current = window.setTimeout(() => {
        timeoutTimer.current = null
        if (!waitingRef.current) return
        refreshHistory()
        finish()
      }, 30000)
    }

  }, [
    historyMessages,
    refreshHistory,
    setPinToTop,
    setWaitingForResponse,
    streamStop,
    waitingForResponse,
  ])
}
