import { useCallback, useRef, useState } from 'react'

/**
 * Merge a new delta into accumulated text, detecting overlaps.
 * If deltaText is a suffix that overlaps with the end of previousText,
 * only append the non-overlapping portion.
 */
function mergeDeltaText(previousText: string, deltaText: string): string {
  if (!deltaText) return previousText
  if (!previousText) return deltaText

  // Check if delta is cumulative (contains previous text as prefix)
  if (deltaText.startsWith(previousText)) {
    return deltaText
  }

  // Check for overlap at the boundary
  const maxOverlap = Math.min(previousText.length, deltaText.length)
  for (let i = maxOverlap; i > 0; i--) {
    if (previousText.endsWith(deltaText.substring(0, i))) {
      return previousText + deltaText.substring(i)
    }
  }

  return previousText + deltaText
}

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
  const seqRef = useRef(new Map<string, number>())
  const onDoneRef = useRef(options.onDone)
  const onErrorRef = useRef(options.onError)
  const onAssistantDeltaRef = useRef(options.onAssistantDelta)
  onDoneRef.current = options.onDone
  onErrorRef.current = options.onError
  onAssistantDeltaRef.current = options.onAssistantDelta

  const stop = useCallback((options?: { preserveState?: boolean }) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    seqRef.current.clear()
    if (options?.preserveState) {
      setState((prev) => ({ ...prev, active: false }))
      return
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

      seqRef.current.clear()

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
          const data = JSON.parse(e.data) as {
            text: string
            sessionKey: string
            seq?: number
          }

          if (typeof data.seq === 'number') {
            const lastSeq = seqRef.current.get(data.sessionKey) ?? -1
            if (data.seq <= lastSeq) return
            seqRef.current.set(data.sessionKey, data.seq)
          }

          setState((prev) => ({
            ...prev,
            text: mergeDeltaText(prev.text, data.text),
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
          es.close()
          eventSourceRef.current = null
          seqRef.current.delete(data.sessionKey)
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
    },
    [],
  )

  return { streaming: state, startStream: start, stopStream: stop }
}
