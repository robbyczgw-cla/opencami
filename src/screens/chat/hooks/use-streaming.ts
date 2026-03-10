import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

export type StreamingState = {
  active: boolean
  text: string
  tools: Array<{ name: string; status: string; id: string }>
  sessionKey: string | null
}

type RawGatewayEvent = {
  event?: string
  payload?: unknown
  seq?: number
  stateVersion?: number
}

type RawAgentPayload = {
  runId?: unknown
  sessionKey?: unknown
  stream?: unknown
  data?: unknown
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
  const doneRef = useRef(false)
  const finalStateRef = useRef(false)
  const activeRunsRef = useRef(new Set<string>())
  const onDoneRef = useRef(options.onDone)
  const onErrorRef = useRef(options.onError)
  const onAssistantDeltaRef = useRef(options.onAssistantDelta)
  onDoneRef.current = options.onDone
  onErrorRef.current = options.onError
  onAssistantDeltaRef.current = options.onAssistantDelta

  const stop = useCallback((options?: { preserveState?: boolean }) => {
    doneRef.current = true
    finalStateRef.current = false
    activeRunsRef.current.clear()
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

  const start = useCallback(function start(sessionKey: string) {
    doneRef.current = false
    finalStateRef.current = false
    activeRunsRef.current.clear()

    setState({
      active: true,
      text: '',
      tools: [],
      sessionKey,
    })

    // If we already have an open EventSource for this session, reuse it.
    // The server stream stays open across multiple messages.
    if (eventSourceRef.current) {
      return
    }

    const es = new EventSource(`/api/stream?sessionKey=${encodeURIComponent(sessionKey)}`)
    eventSourceRef.current = es

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data) as RawGatewayEvent
        if (data.event === 'agent') {
          handleAgentEvent(data.payload, sessionKey, {
            setState,
            onAssistantDelta: onAssistantDeltaRef.current,
            activeRuns: activeRunsRef.current,
          })
          return
        }

        if (data.event === 'chat') {
          const chatPayload = asRecord(data.payload)
          const eventSessionKey =
            normalizeString(chatPayload?.sessionKey) || sessionKey
          const chatState = normalizeString(chatPayload?.state)

          if (chatState === 'final') {
            finalStateRef.current = true
          }

          if (
            !doneRef.current &&
            finalStateRef.current &&
            (chatState === 'final' || activeRunsRef.current.size === 0)
          ) {
            doneRef.current = true
            // Don't close the EventSource — keep it alive for subsequent
            // messages in the same chat. The server stream stays open and
            // will forward events for the next chat.send call too.
            setState((prev) => ({ ...prev, active: false }))
            onDoneRef.current(eventSessionKey)
          }
          return
        }

        if (data.event === 'error') {
          const message =
            typeof data.payload === 'string'
              ? data.payload
              : 'Stream connection lost'
          onErrorRef.current?.(message)
        }
      } catch {
        // ignore parse errors
      }
    })

    es.onerror = () => {
      if (doneRef.current) return
      if (es.readyState === EventSource.CLOSED) {
        eventSourceRef.current = null
        setState((prev) => ({ ...prev, active: false }))
        onErrorRef.current?.('Stream connection lost')
      }
    }
  }, [])

  return { streaming: state, startStream: start, stopStream: stop }
}

function handleAgentEvent(
  payload: unknown,
  fallbackSessionKey: string,
  options: {
    setState: Dispatch<SetStateAction<StreamingState>>
    onAssistantDelta?: (payload: { text: string; sessionKey: string }) => void
    activeRuns: Set<string>
  },
) {
  const agentPayload = asRecord(payload) as RawAgentPayload | null
  const stream = normalizeString(agentPayload?.stream)
  const runId = normalizeString(agentPayload?.runId)
  const sessionKey = normalizeString(agentPayload?.sessionKey) || fallbackSessionKey
  const streamData = asRecord(agentPayload?.data)

  if (runId) {
    if (stream === 'lifecycle') {
      const phase = normalizeString(streamData?.phase)
      if (phase === 'end' || phase === 'error' || phase === 'abort') {
        options.activeRuns.delete(runId)
      } else if (phase) {
        options.activeRuns.add(runId)
      }
    } else {
      options.activeRuns.add(runId)
    }
  }

  if (stream === 'assistant') {
    const text = normalizeString(streamData?.delta) || normalizeString(streamData?.text)
    if (!text) return
    options.setState((prev) => ({
      ...prev,
      sessionKey,
      text: prev.text + text,
    }))
    options.onAssistantDelta?.({ text, sessionKey })
    return
  }

  if (!stream.includes('tool')) return

  const toolId =
    normalizeString(streamData?.toolCallId) ||
    normalizeString(streamData?.id) ||
    normalizeString(streamData?.callId) ||
    `${runId || 'tool'}:${normalizeString(streamData?.toolName) || normalizeString(streamData?.name) || 'unknown'}`
  const toolName =
    normalizeString(streamData?.toolName) ||
    normalizeString(streamData?.name) ||
    'Tool'
  const toolStatus = deriveToolStatus(stream, streamData)

  options.setState((prev) => {
    const tools = [...prev.tools]
    const index = tools.findIndex((tool) => tool.id === toolId)
    const nextTool = { id: toolId, name: toolName, status: toolStatus }
    if (index >= 0) {
      tools[index] = nextTool
    } else {
      tools.push(nextTool)
    }
    return {
      ...prev,
      sessionKey,
      tools,
    }
  })
}

function deriveToolStatus(stream: string, data: Record<string, unknown> | null): string {
  const explicitStatus =
    normalizeString(data?.phase) ||
    normalizeString(data?.status) ||
    normalizeString(data?.state)
  if (explicitStatus) return explicitStatus
  if (stream.includes('result') || stream.includes('output')) return 'done'
  if (stream.includes('call')) return 'running'
  return 'running'
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
