import { useCallback, useRef, useState } from 'react'

type StreamingTool = {
  name: string
  status: string
  id: string
}

export type StreamingState = {
  active: boolean
  text: string
  tools: Array<StreamingTool>
  sessionKey: string | null
}

type StreamFrame = {
  event?: unknown
  payload?: unknown
  seq?: unknown
  stateVersion?: unknown
}

type StreamChatPayload = {
  runId?: string
  sessionKey?: string
  state?: string
  message?: {
    role?: string
    content?: Array<{
      type?: string
      text?: string
      thinking?: string
      id?: string
      name?: string
    }>
    toolCallId?: string
    toolName?: string
  }
  seq?: number
}

const INITIAL_STATE: StreamingState = {
  active: false,
  text: '',
  tools: [],
  sessionKey: null,
}

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
  const sawAgentStreamRef = useRef(false)
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
    sawAgentStreamRef.current = false
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

  const start = useCallback((sessionKey: string) => {
    doneRef.current = false
    sawAgentStreamRef.current = false
    clearPolling()
    streamStartRef.current = Date.now()
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

    const es = new EventSource(
      `/api/stream?sessionKey=${encodeURIComponent(sessionKey)}`,
    )
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const frame = JSON.parse(String(event.data || '{}')) as StreamFrame
        const eventName = normalizeString(frame.event)
        if (!eventName) return

        if (eventName === 'error') {
          const message = normalizeError(frame.payload)
          if (message) {
            onErrorRef.current?.(message)
          }
          return
        }

        if (eventName === 'chat') {
          handleChatPayload(frame.payload, sessionKey, {
            allowDelta: !sawAgentStreamRef.current,
            onAssistantDelta(payload) {
              setState((prev) => ({ ...prev, text: prev.text + payload.text }))
              onAssistantDeltaRef.current?.(payload)
            },
            onDone(resolvedSessionKey) {
              finishStream(es, resolvedSessionKey)
            },
          })
          return
        }

        if (eventName !== 'agent') return

        sawAgentStreamRef.current = true
        handleAgentPayload(frame.payload, sessionKey, {
          onAssistantDelta(payload) {
            setState((prev) => ({ ...prev, text: prev.text + payload.text }))
            onAssistantDeltaRef.current?.(payload)
          },
          onTool(tool) {
            setState((prev) => ({
              ...prev,
              tools: upsertTool(prev.tools, tool),
            }))
          },
          onDone(resolvedSessionKey) {
            finishStream(es, resolvedSessionKey)
          },
        })
      } catch {}
    }

    es.onerror = () => {
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
  }, [])

  function finishStream(es: EventSource, sessionKey: string) {
    doneRef.current = true
    sawAgentStreamRef.current = false
    clearPolling()
    es.close()
    eventSourceRef.current = null
    setState((prev) => ({ ...prev, active: false }))
    onDoneRef.current(sessionKey)
  }

  return { streaming: state, startStream: start, stopStream: stop }
}

function handleChatPayload(
  rawPayload: unknown,
  fallbackSessionKey: string,
  handlers: {
    allowDelta: boolean
    onAssistantDelta: (payload: { text: string; sessionKey: string }) => void
    onDone: (sessionKey: string) => void
  },
) {
  const payload = toChatPayload(rawPayload)
  if (!payload) return

  const resolvedSessionKey = payload.sessionKey || fallbackSessionKey
  const state = normalizeString(payload.state)

  if (state === 'delta') {
    if (!handlers.allowDelta) return
    const text = getChatMessageText(payload)
    if (text) {
      handlers.onAssistantDelta({ text, sessionKey: resolvedSessionKey })
    }
    return
  }

  if (state === 'final' || state === 'error' || state === 'aborted') {
    handlers.onDone(resolvedSessionKey)
  }
}

function handleAgentPayload(
  rawPayload: unknown,
  fallbackSessionKey: string,
  handlers: {
    onAssistantDelta: (payload: { text: string; sessionKey: string }) => void
    onTool: (tool: StreamingTool) => void
    onDone: (sessionKey: string) => void
  },
) {
  if (!rawPayload || typeof rawPayload !== 'object') return

  const payload = rawPayload as Record<string, unknown>
  const resolvedSessionKey =
    normalizeString(payload.sessionKey) || fallbackSessionKey
  const stream = normalizeString(payload.stream)
  const data =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : null

  if (stream === 'assistant') {
    const text =
      readText(data?.text) ||
      readText(data?.delta) ||
      readText(payload.text) ||
      readText(payload.delta)
    if (text) {
      handlers.onAssistantDelta({ text, sessionKey: resolvedSessionKey })
    }
    return
  }

  if (stream === 'lifecycle') {
    const phase = normalizeString(data?.phase) || normalizeString(payload.phase)
    if (phase === 'end' || phase === 'error' || phase === 'aborted') {
      handlers.onDone(resolvedSessionKey)
    }
    return
  }

  if (!stream.includes('tool')) return

  const toolId =
    normalizeString(data?.toolCallId) ||
    normalizeString(data?.id) ||
    normalizeString(data?.callId) ||
    normalizeString(payload.toolCallId) ||
    normalizeString(payload.id)
  const toolName =
    normalizeString(data?.toolName) ||
    normalizeString(data?.name) ||
    normalizeString(payload.toolName) ||
    normalizeString(payload.name) ||
    'tool'

  let status = 'running'
  if (stream.includes('result') || stream.includes('output')) {
    status = normalizeString(data?.error) ? 'error' : 'done'
  } else if (stream.includes('call')) {
    status =
      normalizeString(data?.phase) ||
      normalizeString(data?.status) ||
      normalizeString(payload.phase) ||
      normalizeString(payload.status) ||
      'running'
  }

  handlers.onTool({
    id: toolId || `${toolName}:${status}`,
    name: toolName,
    status,
  })
}

function toChatPayload(value: unknown): StreamChatPayload | null {
  if (!value || typeof value !== 'object') return null
  return value as StreamChatPayload
}

function getChatMessageText(payload: StreamChatPayload): string {
  const content = Array.isArray(payload.message?.content)
    ? payload.message?.content
    : []

  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      if (part.type === 'text') return readText(part.text)
      return ''
    })
    .join('')
}

function upsertTool(
  tools: Array<StreamingTool>,
  nextTool: StreamingTool,
): Array<StreamingTool> {
  const existingIndex = tools.findIndex((tool) => tool.id === nextTool.id)
  if (existingIndex === -1) {
    return [...tools, nextTool]
  }

  const next = [...tools]
  next[existingIndex] = nextTool
  return next
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeError(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  return ''
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
