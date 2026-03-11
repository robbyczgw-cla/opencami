import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

// ─── Types ──────────────────────────────────────────────────────────────

export type StreamContentBlock =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; name: string; id: string; status: string }

export type StreamingState = {
  active: boolean
  /** Full accumulated assistant text (derived from contentBlocks). */
  text: string
  /** Tool invocations (derived from contentBlocks, for backward compat). */
  tools: Array<{ name: string; status: string; id: string }>
  /** Ordered content blocks — preserves the interleaving of text and tools. */
  contentBlocks: StreamContentBlock[]
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
  contentBlocks: [],
  sessionKey: null,
}

// ─── Hook ───────────────────────────────────────────────────────────────

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
  // Track whether we've ever seen a run, to avoid premature onDone when
  // activeRuns is empty simply because no agent events arrived yet.
  const anyRunSeenRef = useRef(false)
  // Mutable ref for the current session key so the long-lived EventSource
  // message handler always reads the latest value (avoids stale closure).
  const sessionKeyRef = useRef('')
  const onDoneRef = useRef(options.onDone)
  const onErrorRef = useRef(options.onError)
  const onAssistantDeltaRef = useRef(options.onAssistantDelta)
  onDoneRef.current = options.onDone
  onErrorRef.current = options.onError
  onAssistantDeltaRef.current = options.onAssistantDelta

  /**
   * Full teardown — closes the EventSource and resets all state.
   * Used when navigating away from a chat session.
   */
  const stop = useCallback((options?: { preserveState?: boolean }) => {
    doneRef.current = true
    finalStateRef.current = false
    activeRunsRef.current.clear()
    anyRunSeenRef.current = false
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

  /**
   * Start (or resume) streaming for a session.
   *
   * If an EventSource is already open and actively streaming (`doneRef` is
   * false), the call is treated as a key-update (e.g. the second
   * `startStream(resolvedKey)` after the send response) — state is NOT
   * reset so in-flight deltas are preserved.
   *
   * If the EventSource exists but the previous message is done, state is
   * reset for the new message while reusing the existing EventSource.
   *
   * If no EventSource exists, a fresh one is created.
   */
  const start = useCallback(function start(sessionKey: string) {
    // Always keep the ref up to date so the EventSource handler reads the
    // latest key regardless of which call path we take.
    sessionKeyRef.current = sessionKey

    // ── Case 1: EventSource open & actively streaming ─────────────
    // Second startStream call (resolved key) — just update the key.
    if (eventSourceRef.current && !doneRef.current) {
      setState((prev) => ({ ...prev, sessionKey, active: true }))
      return
    }

    // ── Case 2 & 3: Need a fresh message state ───────────────────
    doneRef.current = false
    finalStateRef.current = false
    activeRunsRef.current.clear()
    anyRunSeenRef.current = false

    setState({
      active: true,
      text: '',
      tools: [],
      contentBlocks: [],
      sessionKey,
    })

    // Case 2: EventSource exists but was done — reuse it.
    if (eventSourceRef.current) {
      return
    }

    // ── Case 3: Create a fresh EventSource ────────────────────────
    const es = new EventSource(`/api/stream?sessionKey=${encodeURIComponent(sessionKey)}`)
    eventSourceRef.current = es

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data) as RawGatewayEvent
        // Read the latest session key from the ref, NOT the closure.
        const currentKey = sessionKeyRef.current

        if (data.event === 'agent') {
          handleAgentEvent(data.payload, currentKey, {
            setState,
            onAssistantDelta: onAssistantDeltaRef.current,
            activeRuns: activeRunsRef.current,
            anyRunSeen: anyRunSeenRef,
          })
          return
        }

        if (data.event === 'chat') {
          const chatPayload = asRecord(data.payload)
          const eventSessionKey =
            normalizeString(chatPayload?.sessionKey) || currentKey
          const chatState = normalizeString(chatPayload?.state)

          if (chatState === 'final') {
            finalStateRef.current = true
          }

          // Only fire onDone when:
          // 1. We haven't already fired it (doneRef)
          // 2. We've received a final chat state
          // 3. Either chatState is 'final' now, OR all known runs have
          //    ended (but only if we've seen at least one run, to avoid
          //    premature completion before any agent events arrive).
          if (
            !doneRef.current &&
            finalStateRef.current &&
            (chatState === 'final' ||
              (anyRunSeenRef.current && activeRunsRef.current.size === 0))
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

// ─── Event Handling ─────────────────────────────────────────────────────

function handleAgentEvent(
  payload: unknown,
  fallbackSessionKey: string,
  options: {
    setState: Dispatch<SetStateAction<StreamingState>>
    onAssistantDelta?: (payload: { text: string; sessionKey: string }) => void
    activeRuns: Set<string>
    anyRunSeen: { current: boolean }
  },
) {
  const agentPayload = asRecord(payload) as RawAgentPayload | null
  const stream = normalizeString(agentPayload?.stream)
  const runId = normalizeString(agentPayload?.runId)
  const sessionKey = normalizeString(agentPayload?.sessionKey) || fallbackSessionKey
  const streamData = asRecord(agentPayload?.data)

  if (runId) {
    options.anyRunSeen.current = true
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

  // ── Assistant text deltas ─────────────────────────────────────────
  if (stream === 'assistant') {
    const text = normalizeString(streamData?.delta) || normalizeString(streamData?.text)
    if (!text) return
    options.setState((prev) => {
      // Append to the last text block, or create a new one
      const blocks = [...prev.contentBlocks]
      const lastBlock = blocks[blocks.length - 1]
      if (lastBlock?.kind === 'text') {
        blocks[blocks.length - 1] = { ...lastBlock, text: lastBlock.text + text }
      } else {
        blocks.push({ kind: 'text', text })
      }
      return {
        ...prev,
        sessionKey,
        text: prev.text + text,
        contentBlocks: blocks,
      }
    })
    options.onAssistantDelta?.({ text, sessionKey })
    return
  }

  // ── Tool events ───────────────────────────────────────────────────
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
    // Update tools array (backward compat)
    const tools = [...prev.tools]
    const toolIndex = tools.findIndex((tool) => tool.id === toolId)
    const nextTool = { id: toolId, name: toolName, status: toolStatus }
    if (toolIndex >= 0) {
      tools[toolIndex] = nextTool
    } else {
      tools.push(nextTool)
    }

    // Update contentBlocks — preserves interleaving order
    const blocks = [...prev.contentBlocks]
    const blockIndex = blocks.findIndex(
      (b) => b.kind === 'tool' && b.id === toolId,
    )
    const nextBlock: StreamContentBlock = {
      kind: 'tool',
      name: toolName,
      id: toolId,
      status: toolStatus,
    }
    if (blockIndex >= 0) {
      blocks[blockIndex] = nextBlock
    } else {
      blocks.push(nextBlock)
    }

    return {
      ...prev,
      sessionKey,
      tools,
      contentBlocks: blocks,
    }
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────

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
