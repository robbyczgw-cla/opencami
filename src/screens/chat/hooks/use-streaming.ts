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
}) {
  const [state, setState] = useState<StreamingState>(INITIAL_STATE)
  const eventSourceRef = useRef<EventSource | null>(null)
  const onDoneRef = useRef(options.onDone)
  const onErrorRef = useRef(options.onError)
  onDoneRef.current = options.onDone
  onErrorRef.current = options.onError

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setState(INITIAL_STATE)
  }, [])

  const start = useCallback(
    (sessionKey: string) => {
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
          es.close()
          eventSourceRef.current = null
          setState(INITIAL_STATE)
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
    },
    [],
  )

  return { streaming: state, startStream: start, stopStream: stop }
}
