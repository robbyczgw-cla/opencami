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

type HistoryMessage = {
  id?: string
  role?: string
  timestamp?: unknown
  createdAt?: unknown
  created_at?: unknown
  time?: unknown
  ts?: unknown
  content?: unknown
  text?: unknown
}

const INITIAL_STATE: StreamingState = {
  active: false,
  text: '',
  tools: [],
  sessionKey: null,
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const asNumber = Number(trimmed)
    if (Number.isFinite(asNumber)) {
      return asNumber < 1e12 ? asNumber * 1000 : asNumber
    }
    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

function extractMessageText(message: HistoryMessage): string {
  if (typeof message.text === 'string') return message.text
  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.content)) {
    return message.content
      .map((block) => {
        if (!block || typeof block !== 'object') return ''
        return block.type === 'text' && typeof block.text === 'string'
          ? block.text
          : ''
      })
      .join('')
  }
  return ''
}

function fingerprintMessage(message: HistoryMessage): string {
  const normalizedTimestamp = normalizeTimestamp(
    message.createdAt ?? message.created_at ?? message.timestamp ?? message.time ?? message.ts,
  )
  const text = extractMessageText(message)
  const id = typeof message.id === 'string' ? message.id : ''
  return JSON.stringify({ id, timestamp: normalizedTimestamp, text, role: message.role })
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
  const baselineAssistantFingerprintsRef = useRef<Set<string>>(new Set())
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

  async function seedAssistantBaseline(sessionKey: string) {
    try {
      const res = await fetch(
        `/api/history?sessionKey=${encodeURIComponent(sessionKey)}`,
      )
      if (!res.ok) return
      const data = (await res.json()) as { messages?: Array<HistoryMessage> }
      const messages = Array.isArray(data.messages) ? data.messages : []
      baselineAssistantFingerprintsRef.current = new Set(
        messages
          .filter((message) => message?.role === 'assistant')
          .map((message) => fingerprintMessage(message)),
      )
    } catch {}
  }

  function startPolling(sessionKey: string, startedAt: number) {
    if (pollingRef.current) return
    pollingRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/history?sessionKey=${encodeURIComponent(sessionKey)}`,
        )
        if (!res.ok) return
        const data = (await res.json()) as { messages?: Array<HistoryMessage> }
        const messages = Array.isArray(data.messages) ? data.messages : []
        const baselineFingerprints = baselineAssistantFingerprintsRef.current
        // Allow 3s clock-skew tolerance between server and browser.
        // Fallback to baseline-diff detection when timestamps are missing,
        // ISO strings, seconds, or otherwise unreliable.
        const hasNewAssistant = messages.some((message) => {
          if (!message || message.role !== 'assistant') return false
          const normalizedTimestamp = normalizeTimestamp(
            message.createdAt ?? message.created_at ?? message.timestamp ?? message.time ?? message.ts,
          )
          if (normalizedTimestamp && normalizedTimestamp > startedAt - 3_000) {
            return true
          }
          return !baselineFingerprints.has(fingerprintMessage(message))
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
      baselineAssistantFingerprintsRef.current = new Set()
      void seedAssistantBaseline(sessionKey)
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
