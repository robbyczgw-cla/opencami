import { useEffect, useRef } from 'react'

import { textFromMessage } from '../utils'
import { setPendingGeneration } from '../pending-send'
import type { GatewayMessage } from '../types'

type UseChatIdleFinishInput = {
  historyMessages: Array<GatewayMessage>
  streamStop: () => void
  setWaitingForResponse: (value: boolean) => void
}

export function useChatIdleFinish({
  historyMessages,
  streamStop,
  setWaitingForResponse,
}: UseChatIdleFinishInput) {
  const lastAssistantSignature = useRef('')
  const streamIdleTimer = useRef<number | null>(null)

  useEffect(() => {
    if (historyMessages.length === 0) return
    const latestMessage = historyMessages[historyMessages.length - 1]
    if (latestMessage.role !== 'assistant') return
    const signature = `${historyMessages.length}:${textFromMessage(latestMessage).slice(-64)}`
    if (signature !== lastAssistantSignature.current) {
      lastAssistantSignature.current = signature
      if (streamIdleTimer.current) {
        window.clearTimeout(streamIdleTimer.current)
      }
      streamIdleTimer.current = window.setTimeout(() => {
        streamStop()
        setPendingGeneration(false)
        setWaitingForResponse(false)
      }, 12000)
    }
    return () => {
      if (streamIdleTimer.current) {
        window.clearTimeout(streamIdleTimer.current)
        streamIdleTimer.current = null
      }
    }
  }, [historyMessages, setWaitingForResponse, streamStop])
}
