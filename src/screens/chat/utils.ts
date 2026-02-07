import type {
  GatewayMessage,
  SessionMeta,
  SessionSummary,
  ToolCallContent,
} from './types'

type SessionKind = NonNullable<SessionMeta['kind']>

export function deriveFriendlyIdFromKey(key: string | undefined): string {
  if (!key) return 'main'
  const trimmed = key.trim()
  if (trimmed.length === 0) return 'main'
  const parts = trimmed.split(':')
  const tail = parts[parts.length - 1] ?? ''
  const tailTrimmed = tail.trim()
  return tailTrimmed.length > 0 ? tailTrimmed : trimmed
}

export function textFromMessage(msg: GatewayMessage): string {
  const parts = Array.isArray(msg.content) ? msg.content : []
  return parts
    .map((part) => (part.type === 'text' ? String(part.text ?? '') : ''))
    .join('')
    .trim()
}

export function getToolCallsFromMessage(
  msg: GatewayMessage,
): Array<ToolCallContent> {
  const parts = Array.isArray(msg.content) ? msg.content : []
  return parts.filter(
    (part): part is ToolCallContent => part.type === 'toolCall',
  )
}

export function findToolResultForCall(
  toolCallId: string,
  messages: Array<GatewayMessage>,
): GatewayMessage | undefined {
  return messages.find(
    (msg) => msg.role === 'toolResult' && msg.toolCallId === toolCallId,
  )
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 1_000_000_000_000) return value * 1000
    return value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

export function getMessageTimestamp(message: GatewayMessage): number {
  const candidates = [
    (message as any).createdAt,
    (message as any).created_at,
    (message as any).timestamp,
    (message as any).time,
    (message as any).ts,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeTimestamp(candidate)
    if (normalized) return normalized
  }

  return Date.now()
}

const PROTECTED_KEYS = ['agent:main:main', 'main']

/**
 * The primary agent session should not be deletable — it is the main
 * long-running conversation session.
 *
 * Other sessions (including Discord, Signal, etc.) are deletable since
 * deletion only archives the transcript, not permanently destroys it.
 */
export function isProtectedSession(key: string): boolean {
  return PROTECTED_KEYS.includes(key)
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function deriveSessionKind(key: string): SessionKind {
  // Sub-agents: codex, explicit subagent, openai-spawned sessions
  if (
    key.includes(':subagent:') ||
    key.startsWith('agent:codex:') ||
    key.includes(':openai:')
  ) {
    return 'subagent'
  }
  // Cron/isolated sessions
  if (key.startsWith('isolated:') || key.includes(':cron:')) return 'cron'
  // Non-main agents (tefy, grok, etc.)
  if (
    key.startsWith('agent:') &&
    !key.startsWith('agent:main:')
  ) {
    return 'other'
  }
  // OpenCami / webchat sessions: agent:main:<uuid> (no channel prefix)
  if (key.startsWith('agent:main:')) {
    const tail = key.slice('agent:main:'.length)
    if (UUID_PATTERN.test(tail)) return 'webchat'
    return 'chat'
  }
  return 'other'
}

export function normalizeSessions(
  rows: Array<SessionSummary> | undefined,
): Array<SessionMeta> {
  if (!Array.isArray(rows)) return []
  return rows.map((session) => {
    const key =
      typeof session.key === 'string' && session.key.trim().length > 0
        ? session.key.trim()
        : deriveFriendlyIdFromKey(session.friendlyId ?? session.key)
    const friendlyIdCandidate =
      typeof session.friendlyId === 'string' &&
      session.friendlyId.trim().length > 0
        ? session.friendlyId.trim()
        : deriveFriendlyIdFromKey(key)
    const kind = deriveSessionKind(key)

    // Extract token counts from the gateway response (may be on the raw session object)
    const rawSession = session as Record<string, unknown>
    const totalTokens =
      typeof rawSession.totalTokens === 'number' ? rawSession.totalTokens : undefined
    const contextTokens =
      typeof rawSession.contextTokens === 'number' ? rawSession.contextTokens : undefined

    return {
      key,
      friendlyId: friendlyIdCandidate,
      title: typeof session.title === 'string' ? session.title : undefined,
      derivedTitle:
        typeof session.derivedTitle === 'string'
          ? session.derivedTitle
          : undefined,
      label: typeof session.label === 'string' ? session.label : undefined,
      updatedAt:
        typeof session.updatedAt === 'number' ? session.updatedAt : undefined,
      lastMessage: session.lastMessage ?? null,
      kind,
      totalTokens,
      contextTokens,
    }
  })
}

export async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data?.error) return String(data.error)
    if (data?.message) return String(data.message)
    return JSON.stringify(data)
  } catch {
    try {
      return await res.text()
    } catch {
      return res.statusText || 'Request failed'
    }
  }
}

export const missingGatewayAuthMessage =
  'Missing gateway auth. Set CLAWDBOT_GATEWAY_TOKEN (recommended) or CLAWDBOT_GATEWAY_PASSWORD in the server environment.'

export function isMissingGatewayAuth(message: string): boolean {
  return message.includes(missingGatewayAuthMessage)
}
