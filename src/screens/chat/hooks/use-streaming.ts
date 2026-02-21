import { useCallback, useRef, useState } from 'react'

export type StreamingState = {
  /** Whether we're currently receiving streamed content */
  active: boolean
  /** Accumulated text from assistant deltas */
  text: string
  /** Currently active tool calls */
  tools: Array<{ name: string; status: string; id: string }>
  /** The sessionKey this stream is for */
  sessionKey: string | null
}

const INITIAL_STATE: StreamingState = {
  active: false,
  text: '',
  tools: [],
  sessionKey: null,
}

/**
 * Hook that manages an SSE connection to /api/stream for real-time
 * message streaming from the Gateway's persistent WebSocket.
 */
export function useStreaming(options: {
  onDone: (sessionKey: string) => void
  onError?: (error: string) => void
  onAssistantDelta?: (payload: { text: string; sessionKey: string }) => void
}) {
  const [state, setState] = useState<StreamingState>(INITIAL_STATE)
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamStartRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  const onDoneRef = useRef(options.onDone)
  const onErrorRef = useRef(options.onError)
  const onAssistantDeltaRef = useRef(options.onAssistantDelta)
  onDoneRef.current = options.onDone
  onErrorRef.current = options.onError
  onAssistantDeltaRef.current = options.onAssistantDelta

  function clearPolling() {
    if (pollingTimeoutRef.current) {
      window.clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  function startPolling(sessionKey: string, startedAt: number) {
    if (pollingRef.current) return
    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/history?sessionKey=${encodeURIComponent(sessionKey)}`,
        )
        if (!res.ok) return
        const data = (await res.json()) as {
          messages?: Array<{ role?: string; timestamp?: number }>
        }
        const messages = Array.isArray(data.messages) ? data.messages : []
        // Allow 10s clock-skew tolerance between server and browser
        const hasNewAssistant = messages.some((message) => {
          if (!message || message.role !== 'assistant') return false
          if (typeof message.timestamp !== 'number') return false
          return message.timestamp > startedAt - 3_000
        })
        if (!hasNewAssistant) return
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
        clearPolling()
        setState((prev) => ({ ...prev, active: false }))
        onDoneRef.current(sessionKey)
      } catch {}
    }, 2000)
  }

  const stop = useCallback((options?: { preserveState?: boolean }) => {
    doneRef.current = true
    clearPolling()
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (options?.preserveState) {
      setState((prev) => ({ ...prev, active: false }))
      return
    }
    setState(INITIAL_STATE)
  }, [])

  const start = useCallback(
    function start(sessionKey: string) {
      doneRef.current = false
      clearPolling()
      streamStartRef.current = Date.now()
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      setState({
        active: true,
        text: '',
        tools: [],
        sessionKey,
      })

      const es = new EventSource(`/api/stream?sessionKey=${encodeURIComponent(sessionKey)}`)
      eventSourceRef.current = es

      es.addEventListener('delta', (e) => {
        try {
          const data = JSON.parse(e.data) as { text: string; sessionKey: string }
          setState((prev) => ({
            ...prev,
            text: prev.text + data.text,
          }))
          onAssistantDeltaRef.current?.({ text: data.text, sessionKey: data.sessionKey })
        } catch {}
      })

      es.addEventListener('tool', (e) => {
        try {
          const data = JSON.parse(e.data) as {
            name: string
            status: string
            id: string
            sessionKey: string
          }
          setState((prev) => {
            const existingIdx = prev.tools.findIndex((t) => t.id === data.id)
            const tools = [...prev.tools]
            if (existingIdx >= 0) {
              tools[existingIdx] = { name: data.name, status: data.status, id: data.id }
            } else {
              tools.push({ name: data.name, status: data.status, id: data.id })
            }
            return { ...prev, tools }
          })
        } catch {}
      })

      es.addEventListener('done', (e) => {
        try {
          const data = JSON.parse(e.data) as { sessionKey: string; status: string }
          doneRef.current = true
          clearPolling()
          es.close()
          eventSourceRef.current = null
          // Mark stream as inactive but keep text/tools so the UI can
          // continue displaying them until history refetch completes.
          setState((prev) => ({ ...prev, active: false }))
          onDoneRef.current(data.sessionKey)
        } catch {}
      })

      es.onerror = () => {
        // EventSource auto-reconnects on error, but if the connection is
        // definitely broken we fall back to polling. Close after a brief
        // moment so we don't spin-reconnect.
        if (es.readyState === EventSource.CLOSED) {
          es.close()
          eventSourceRef.current = null
          setState(INITIAL_STATE)
          onErrorRef.current?.('Stream connection lost')
        }
      }
      pollingTimeoutRef.current = window.setTimeout(() => {
        if (doneRef.current) return
        const startedAt = streamStartRef.current ?? Date.now()
        startPolling(sessionKey, startedAt)
      }, 3000)
    },
    [],
  )

  return { streaming: state, startStream: start, stopStream: stop }
}
