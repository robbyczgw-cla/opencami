import { describe, expect, it, vi } from 'vitest'
import {
  handleAgentEvent,
  deriveToolStatus,
  asRecord,
  normalizeString,
} from '@/screens/chat/hooks/streaming-helpers'
import type { StreamingState } from '@/screens/chat/hooks/use-streaming'

// ─── Helper: run setState updaters and return final state ────────────────

function applySetState(
  initial: StreamingState,
  fn: (setState: (updater: StreamingState | ((prev: StreamingState) => StreamingState)) => void) => void,
): StreamingState {
  let state = initial
  const setState = (updater: StreamingState | ((prev: StreamingState) => StreamingState)) => {
    state = typeof updater === 'function' ? updater(state) : updater
  }
  fn(setState)
  return state
}

const EMPTY_STATE: StreamingState = {
  active: false,
  text: '',
  tools: [],
  contentBlocks: [],
  sessionKey: null,
}

// ─── normalizeString ─────────────────────────────────────────────────────

describe('normalizeString', () => {
  it('trims strings', () => {
    expect(normalizeString('  hello  ')).toBe('hello')
  })

  it('returns empty string for non-strings', () => {
    expect(normalizeString(null)).toBe('')
    expect(normalizeString(undefined)).toBe('')
    expect(normalizeString(42)).toBe('')
    expect(normalizeString({})).toBe('')
    expect(normalizeString(true)).toBe('')
  })
})

// ─── asRecord ────────────────────────────────────────────────────────────

describe('asRecord', () => {
  it('returns objects as records', () => {
    const obj = { foo: 'bar' }
    expect(asRecord(obj)).toBe(obj)
  })

  it('returns arrays as records (they are objects)', () => {
    const arr = [1, 2, 3]
    expect(asRecord(arr)).toBe(arr)
  })

  it('returns null for primitives', () => {
    expect(asRecord(null)).toBeNull()
    expect(asRecord(undefined)).toBeNull()
    expect(asRecord('')).toBeNull()
    expect(asRecord(0)).toBeNull()
    expect(asRecord(false)).toBeNull()
  })
})

// ─── deriveToolStatus ────────────────────────────────────────────────────

describe('deriveToolStatus', () => {
  it('returns explicit phase from data', () => {
    expect(deriveToolStatus('tool.call', { phase: 'running' })).toBe('running')
    expect(deriveToolStatus('tool.call', { status: 'done' })).toBe('done')
    expect(deriveToolStatus('tool.call', { state: 'error' })).toBe('error')
  })

  it('infers done from result/output stream names', () => {
    expect(deriveToolStatus('tool.result', null)).toBe('done')
    expect(deriveToolStatus('tool.output', null)).toBe('done')
  })

  it('infers running from call stream names', () => {
    expect(deriveToolStatus('tool.call', null)).toBe('running')
  })

  it('defaults to running for unknown stream names', () => {
    expect(deriveToolStatus('tool.something', null)).toBe('running')
  })
})

// ─── handleAgentEvent: assistant text deltas ─────────────────────────────

describe('handleAgentEvent — assistant text', () => {
  it('accumulates text from delta events', () => {
    const state = applySetState(EMPTY_STATE, (setState) => {
      const options = {
        setState,
        activeRuns: new Set<string>(),
        anyRunSeen: { current: false },
      }

      handleAgentEvent(
        { stream: 'assistant', data: { delta: 'Hello' }, runId: 'r1' },
        'session-1',
        options,
      )
      handleAgentEvent(
        { stream: 'assistant', data: { delta: 'world' }, runId: 'r1' },
        'session-1',
        options,
      )
    })

    // normalizeString trims each delta, so consecutive deltas are concatenated directly
    expect(state.text).toBe('Helloworld')
    expect(state.contentBlocks).toHaveLength(1)
    expect(state.contentBlocks[0]).toEqual({ kind: 'text', text: 'Helloworld' })
    expect(state.sessionKey).toBe('session-1')
  })

  it('uses payload sessionKey over fallback', () => {
    const state = applySetState(EMPTY_STATE, (setState) => {
      handleAgentEvent(
        { stream: 'assistant', data: { delta: 'hi' }, sessionKey: 'real-key', runId: 'r1' },
        'fallback-key',
        {
          setState,
          activeRuns: new Set<string>(),
          anyRunSeen: { current: false },
        },
      )
    })

    expect(state.sessionKey).toBe('real-key')
  })

  it('calls onAssistantDelta callback', () => {
    const onDelta = vi.fn()
    applySetState(EMPTY_STATE, (setState) => {
      handleAgentEvent(
        { stream: 'assistant', data: { delta: 'hey' }, runId: 'r1' },
        'key',
        {
          setState,
          onAssistantDelta: onDelta,
          activeRuns: new Set<string>(),
          anyRunSeen: { current: false },
        },
      )
    })

    expect(onDelta).toHaveBeenCalledWith({ text: 'hey', sessionKey: 'key' })
  })

  it('ignores assistant events with empty text', () => {
    const state = applySetState(EMPTY_STATE, (setState) => {
      handleAgentEvent(
        { stream: 'assistant', data: { delta: '   ' }, runId: 'r1' },
        'key',
        {
          setState,
          activeRuns: new Set<string>(),
          anyRunSeen: { current: false },
        },
      )
    })

    expect(state.text).toBe('')
    expect(state.contentBlocks).toHaveLength(0)
  })
})

// ─── handleAgentEvent: tool events ───────────────────────────────────────

describe('handleAgentEvent — tool events', () => {
  it('creates tool content block from tool.call event', () => {
    const state = applySetState(EMPTY_STATE, (setState) => {
      handleAgentEvent(
        {
          stream: 'tool.call',
          data: {
            toolCallId: 'tc-1',
            toolName: 'web_search',
            arguments: { query: 'test' },
          },
          runId: 'r1',
        },
        'key',
        {
          setState,
          activeRuns: new Set<string>(),
          anyRunSeen: { current: false },
        },
      )
    })

    expect(state.tools).toHaveLength(1)
    expect(state.tools[0]).toEqual({ id: 'tc-1', name: 'web_search', status: 'running' })
    expect(state.contentBlocks).toHaveLength(1)
    expect(state.contentBlocks[0]).toEqual({
      kind: 'tool',
      id: 'tc-1',
      name: 'web_search',
      status: 'running',
      arguments: { query: 'test' },
      output: undefined,
    })
  })

  it('updates existing tool block with result', () => {
    const state = applySetState(EMPTY_STATE, (setState) => {
      const options = {
        setState,
        activeRuns: new Set<string>(),
        anyRunSeen: { current: false },
      }

      // tool.call first
      handleAgentEvent(
        {
          stream: 'tool.call',
          data: { toolCallId: 'tc-1', toolName: 'web_search', arguments: { query: 'q' } },
          runId: 'r1',
        },
        'key',
        options,
      )

      // then tool.result
      handleAgentEvent(
        {
          stream: 'tool.result',
          data: { toolCallId: 'tc-1', toolName: 'web_search', result: 'found it' },
          runId: 'r1',
        },
        'key',
        options,
      )
    })

    expect(state.contentBlocks).toHaveLength(1)
    const block = state.contentBlocks[0]
    expect(block).toMatchObject({
      kind: 'tool',
      id: 'tc-1',
      status: 'done',
      arguments: { query: 'q' }, // preserved from call event
      output: 'found it',
    })
    expect(state.tools[0].status).toBe('done')
  })

  it('preserves text/tool interleaving order', () => {
    const state = applySetState(EMPTY_STATE, (setState) => {
      const options = {
        setState,
        activeRuns: new Set<string>(),
        anyRunSeen: { current: false },
      }

      handleAgentEvent(
        { stream: 'assistant', data: { delta: 'Before tool' }, runId: 'r1' },
        'key',
        options,
      )
      handleAgentEvent(
        {
          stream: 'tool.call',
          data: { toolCallId: 'tc-1', toolName: 'exec' },
          runId: 'r1',
        },
        'key',
        options,
      )
      handleAgentEvent(
        { stream: 'assistant', data: { delta: 'After tool' }, runId: 'r1' },
        'key',
        options,
      )
    })

    expect(state.contentBlocks).toHaveLength(3)
    expect(state.contentBlocks[0]).toMatchObject({ kind: 'text', text: 'Before tool' })
    expect(state.contentBlocks[1]).toMatchObject({ kind: 'tool', name: 'exec' })
    expect(state.contentBlocks[2]).toMatchObject({ kind: 'text', text: 'After tool' })
  })

  it('generates fallback tool ID from runId and name', () => {
    const state = applySetState(EMPTY_STATE, (setState) => {
      handleAgentEvent(
        {
          stream: 'tool.call',
          data: { toolName: 'my_tool' },
          runId: 'run-42',
        },
        'key',
        {
          setState,
          activeRuns: new Set<string>(),
          anyRunSeen: { current: false },
        },
      )
    })

    expect(state.tools[0].id).toBe('run-42:my_tool')
  })
})

// ─── handleAgentEvent: lifecycle tracking ────────────────────────────────

describe('handleAgentEvent — lifecycle', () => {
  it('tracks active runs', () => {
    const activeRuns = new Set<string>()
    const anyRunSeen = { current: false }

    applySetState(EMPTY_STATE, (setState) => {
      const options = { setState, activeRuns, anyRunSeen }

      handleAgentEvent(
        { stream: 'assistant', data: { delta: 'hi' }, runId: 'r1' },
        'key',
        options,
      )
      expect(activeRuns.has('r1')).toBe(true)
      expect(anyRunSeen.current).toBe(true)
    })
  })

  it('removes run on lifecycle end', () => {
    const activeRuns = new Set<string>()
    const anyRunSeen = { current: false }

    applySetState(EMPTY_STATE, (setState) => {
      const options = { setState, activeRuns, anyRunSeen }

      // Start
      handleAgentEvent(
        { stream: 'lifecycle', data: { phase: 'start' }, runId: 'r1' },
        'key',
        options,
      )
      expect(activeRuns.has('r1')).toBe(true)

      // End
      handleAgentEvent(
        { stream: 'lifecycle', data: { phase: 'end' }, runId: 'r1' },
        'key',
        options,
      )
      expect(activeRuns.has('r1')).toBe(false)
    })
  })

  it('removes run on lifecycle error/abort', () => {
    const activeRuns = new Set<string>()
    const anyRunSeen = { current: false }

    applySetState(EMPTY_STATE, (setState) => {
      const options = { setState, activeRuns, anyRunSeen }

      handleAgentEvent(
        { stream: 'lifecycle', data: { phase: 'start' }, runId: 'r1' },
        'key',
        options,
      )
      handleAgentEvent(
        { stream: 'lifecycle', data: { phase: 'error' }, runId: 'r1' },
        'key',
        options,
      )
      expect(activeRuns.has('r1')).toBe(false)
    })
  })

  it('handles null/invalid payloads gracefully', () => {
    const state = applySetState(EMPTY_STATE, (setState) => {
      handleAgentEvent(null, 'key', {
        setState,
        activeRuns: new Set<string>(),
        anyRunSeen: { current: false },
      })
      handleAgentEvent(42, 'key', {
        setState,
        activeRuns: new Set<string>(),
        anyRunSeen: { current: false },
      })
      handleAgentEvent('invalid', 'key', {
        setState,
        activeRuns: new Set<string>(),
        anyRunSeen: { current: false },
      })
    })

    // Should not crash, state unchanged
    expect(state.text).toBe('')
    expect(state.contentBlocks).toHaveLength(0)
  })
})
