import {
  useCallback,
  useRef,
  useState,
} from 'react'
import {
  handleAgentEvent,
  asRecord,
  normalizeString,
} from './streaming-helpers'

// ─── Types ──────────────────────────────────────────────────────────────

export type StreamContentBlock =
  | { kind: 'text'; text: string }
  | {
      kind: 'tool'
      name: string
      id: string
      status: string
      arguments?: Record<string, unknown>
      output?: string
    }

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
  // Seq-based deduplication: gateway events carry an incrementing seq number.
  // If we see a seq we've already processed, skip it. This guards against
  // duplicate delivery caused by Vite SSR multi-context dispatch or similar.
  const lastSeqRef = useRef(-1)
  // Content-based deduplication: if consecutive agent events have identical
  // payloads (same event type + same data), skip the duplicate. This catches
  // cases where duplicated events carry *different* seq values (e.g. two WS
  // connections each forwarding the same gateway event with their own seq).
  const lastAgentFingerprintRef = useRef('')
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
    lastSeqRef.current = -1
    lastAgentFingerprintRef.current = ''
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
    lastSeqRef.current = -1
    lastAgentFingerprintRef.current = ''

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

        // Seq-based deduplication: skip events we've already processed.
        if (typeof data.seq === 'number') {
          if (data.seq <= lastSeqRef.current) return
          lastSeqRef.current = data.seq
        }

        // Read the latest session key from the ref, NOT the closure.
        const currentKey = sessionKeyRef.current

        if (data.event === 'agent') {
          // Content-based dedup: skip consecutive agent events with identical
          // payloads. Catches duplicates that have *different* seq values
          // (e.g. from parallel WS connections or Vite SSR multi-context).
          const fp = JSON.stringify(data.payload)
          if (fp === lastAgentFingerprintRef.current) return
          lastAgentFingerprintRef.current = fp

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
