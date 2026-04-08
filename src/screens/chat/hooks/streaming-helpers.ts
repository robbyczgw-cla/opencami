import type { Dispatch, SetStateAction } from 'react'
import type { StreamContentBlock, StreamingState } from './use-streaming'

// ─── Types ───────────────────────────────────────────────────────────────

type RawAgentPayload = {
  runId?: unknown
  sessionKey?: unknown
  stream?: unknown
  data?: unknown
}

export type HandleAgentEventOptions = {
  setState: Dispatch<SetStateAction<StreamingState>>
  onAssistantDelta?: (payload: { text: string; sessionKey: string }) => void
  activeRuns: Set<string>
  anyRunSeen: { current: boolean }
}

// ─── Event Handling ──────────────────────────────────────────────────────

export function handleAgentEvent(
  payload: unknown,
  fallbackSessionKey: string,
  options: HandleAgentEventOptions,
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
    const text = rawString(streamData?.delta) || rawString(streamData?.text)
    if (text.length === 0) return
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

  // Extract tool input (arguments) and output from the event data.
  // Gateway events may carry these under various field names.
  const toolArgs =
    asRecord(streamData?.arguments) ||
    asRecord(streamData?.input) ||
    asRecord(streamData?.params) ||
    null
  const toolOutput =
    normalizeString(streamData?.result) ||
    normalizeString(streamData?.output) ||
    (stream.includes('result') ? normalizeString(streamData?.text) : '')

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
    const existingBlock = blockIndex >= 0
      ? (blocks[blockIndex] as StreamContentBlock & { kind: 'tool' })
      : null
    const nextBlock: StreamContentBlock = {
      kind: 'tool',
      name: toolName,
      id: toolId,
      status: toolStatus,
      // Merge: keep existing arguments/output if new event doesn't carry them
      arguments: toolArgs ?? existingBlock?.arguments,
      output: toolOutput || existingBlock?.output || undefined,
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

// ─── Helpers ─────────────────────────────────────────────────────────────

export function deriveToolStatus(stream: string, data: Record<string, unknown> | null): string {
  const explicitStatus =
    normalizeString(data?.phase) ||
    normalizeString(data?.status) ||
    normalizeString(data?.state)
  if (explicitStatus) return explicitStatus
  if (stream.includes('result') || stream.includes('output')) return 'done'
  if (stream.includes('call')) return 'running'
  return 'running'
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null
}

export function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function rawString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
