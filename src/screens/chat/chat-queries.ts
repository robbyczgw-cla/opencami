import { normalizeSessions, readError } from './utils'
import type { QueryClient } from '@tanstack/react-query'
import type {
  GatewayMessage,
  HistoryResponse,
  SessionListResponse,
  SessionMeta,
} from './types'

type GatewayStatusResponse = {
  ok: boolean
  error?: string
}

export const chatQueryKeys = {
  sessions: ['chat', 'sessions'] as const,
  history: function history(friendlyId: string, sessionKey: string) {
    return ['chat', 'history', friendlyId, sessionKey] as const
  },
} as const

export async function fetchSessions(): Promise<Array<SessionMeta>> {
  const res = await fetch('/api/sessions')
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as SessionListResponse
  return normalizeSessions(data.sessions)
}

export async function fetchHistory(payload: {
  sessionKey: string
  friendlyId: string
}): Promise<HistoryResponse> {
  const query = new URLSearchParams({ limit: '200' })
  if (payload.sessionKey) query.set('sessionKey', payload.sessionKey)
  if (payload.friendlyId) query.set('friendlyId', payload.friendlyId)
  const res = await fetch(`/api/history?${query.toString()}`)
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as HistoryResponse
}

export async function fetchGatewayStatus(): Promise<GatewayStatusResponse> {
  const controller = new AbortController()
  // The first ping can take a while because the server-side WS connection
  // to the gateway must complete a full handshake (nonce exchange + connect
  // RPC + optional device auth). 8s is generous enough for slow starts.
  const timeout = window.setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch('/api/ping', { signal: controller.signal })
    if (!res.ok) throw new Error(await readError(res))
    return (await res.json()) as GatewayStatusResponse
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Gateway check timed out')
    }
    throw err
  } finally {
    window.clearTimeout(timeout)
  }
}

export function updateHistoryMessages(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
  updater: (messages: Array<GatewayMessage>) => Array<GatewayMessage>,
) {
  const queryKey = chatQueryKeys.history(friendlyId, sessionKey)
  queryClient.setQueryData(queryKey, function update(data: unknown) {
    const current = data as HistoryResponse | undefined
    const messages = Array.isArray(current?.messages) ? current.messages : []
    const nextMessages = updater(messages)
    return {
      sessionKey: current?.sessionKey ?? sessionKey,
      sessionId: current?.sessionId,
      messages: nextMessages,
    }
  })
}

function normalizeId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function areSameHistoryMessage(a: GatewayMessage, b: GatewayMessage): boolean {
  const aId = normalizeId((a as { id?: unknown }).id)
  const bId = normalizeId((b as { id?: unknown }).id)
  if (aId && bId) return aId === bId

  const aClientId = normalizeId(a.clientId)
  const bClientId = normalizeId(b.clientId)
  if (aClientId && bClientId) return aClientId === bClientId

  const aOptimisticId = normalizeId(a.__optimisticId)
  const bOptimisticId = normalizeId(b.__optimisticId)
  if (aOptimisticId && bOptimisticId) return aOptimisticId === bOptimisticId

  return false
}

export function appendHistoryMessage(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
  message: GatewayMessage,
) {
  updateHistoryMessages(
    queryClient,
    friendlyId,
    sessionKey,
    function append(messages) {
      if (messages.some((existing) => areSameHistoryMessage(existing, message))) {
        return messages
      }
      return [...messages, message]
    },
  )
}

export function updateHistoryMessageByClientId(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
  clientId: string,
  updater: (message: GatewayMessage) => GatewayMessage,
) {
  const optimisticId = `opt-${clientId}`
  updateHistoryMessages(
    queryClient,
    friendlyId,
    sessionKey,
    function update(messages) {
      return messages.map((message) => {
        if (
          message.clientId === clientId ||
          message.__optimisticId === clientId ||
          message.__optimisticId === optimisticId
        ) {
          return updater(message)
        }
        return message
      })
    },
  )
}

export function removeHistoryMessageByClientId(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
  clientId: string,
  optimisticId?: string,
) {
  updateHistoryMessages(
    queryClient,
    friendlyId,
    sessionKey,
    function remove(messages) {
      return messages.filter((message) => {
        if (message.clientId === clientId) return false
        if (message.__optimisticId === clientId) return false
        if (optimisticId && message.__optimisticId === optimisticId)
          return false
        return true
      })
    },
  )
}

export function clearHistoryMessages(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
) {
  const queryKey = chatQueryKeys.history(friendlyId, sessionKey)
  queryClient.setQueryData(queryKey, {
    sessionKey,
    messages: [],
  })
}

export function moveHistoryMessages(
  queryClient: QueryClient,
  fromFriendlyId: string,
  fromSessionKey: string,
  toFriendlyId: string,
  toSessionKey: string,
) {
  const fromKey = chatQueryKeys.history(fromFriendlyId, fromSessionKey)
  const toKey = chatQueryKeys.history(toFriendlyId, toSessionKey)
  const fromData = queryClient.getQueryData(fromKey) as
    | HistoryResponse
    | undefined
  if (!fromData) return
  const messages = Array.isArray(fromData.messages) ? fromData.messages : []
  queryClient.setQueryData(toKey, {
    sessionKey: toSessionKey,
    sessionId: fromData.sessionId,
    messages,
  })
  queryClient.removeQueries({ queryKey: fromKey, exact: true })
}

export function updateSessionLastMessage(
  queryClient: QueryClient,
  sessionKey: string,
  friendlyId: string,
  message: GatewayMessage,
) {
  queryClient.setQueryData(
    chatQueryKeys.sessions,
    function update(messages: unknown) {
      if (!Array.isArray(messages)) return messages
      return (messages as Array<SessionMeta>).map((session) => {
        if (session.key !== sessionKey && session.friendlyId !== friendlyId) {
          return session
        }
        return {
          ...session,
          lastMessage: message,
        }
      })
    },
  )
}

export function removeSessionFromCache(
  queryClient: QueryClient,
  sessionKey: string,
  friendlyId: string,
) {
  queryClient.setQueryData(
    chatQueryKeys.sessions,
    function update(messages: unknown) {
      if (!Array.isArray(messages)) return messages
      return (messages as Array<SessionMeta>).filter((session) => {
        return session.key !== sessionKey && session.friendlyId !== friendlyId
      })
    },
  )

  queryClient.removeQueries({
    queryKey: ['chat', 'history', friendlyId],
    exact: false,
  })
  if (sessionKey && sessionKey !== friendlyId) {
    queryClient.removeQueries({
      queryKey: ['chat', 'history', sessionKey],
      exact: false,
    })
  }
}

/**
 * Update session label/title in cache and persist to server
 */
export async function updateSessionLabel(
  queryClient: QueryClient,
  sessionKey: string,
  friendlyId: string,
  label: string,
): Promise<void> {
  // Optimistically update the cache
  queryClient.setQueryData(
    chatQueryKeys.sessions,
    function update(data: unknown) {
      if (!Array.isArray(data)) return data
      return (data as Array<SessionMeta>).map((session) => {
        if (session.key === sessionKey || session.friendlyId === friendlyId) {
          return { ...session, label }
        }
        return session
      })
    },
  )

  // Persist to server
  try {
    const res = await fetch('/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey, friendlyId, label }),
    })

    if (!res.ok) {
      const errorText = await readError(res)
      console.error('[updateSessionLabel] Failed to persist:', errorText)
      return
    }

    // Refresh session metadata from the server as soon as the patch lands.
    // The first title update can race with initial session creation, and the
    // active title falls back to derived/raw ids until the sessions query sees
    // the persisted label.
    await queryClient.invalidateQueries({ queryKey: chatQueryKeys.sessions })
  } catch (err) {
    console.error('[updateSessionLabel] Network error:', err)
  }
}
