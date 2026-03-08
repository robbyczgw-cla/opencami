import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'

type SessionsResolveResponse = {
  ok?: boolean
  key?: string
}

type SessionEntry = {
  key?: string
  model?: string
  modelOverride?: string
  modelProvider?: string
  resolved?: {
    model?: string
    modelProvider?: string
  }
}

type SessionsGetResponse = {
  ok?: boolean
  key?: string
  entry?: SessionEntry
  resolved?: {
    model?: string
    modelProvider?: string
  }
  messages?: unknown[]
}

type SessionsListResponse = {
  sessions?: SessionEntry[]
}

type SessionsPatchResponse = {
  ok?: boolean
  key?: string
  entry?: SessionEntry
  resolved?: {
    model?: string
    modelProvider?: string
  }
}

async function resolveSessionKey(sessionKey: string, friendlyId: string) {
  if (sessionKey) return sessionKey
  if (!friendlyId) return 'main'

  const resolved = await gatewayRpc<SessionsResolveResponse>(
    'sessions.resolve',
    {
      key: friendlyId,
      includeUnknown: true,
      includeGlobal: true,
    },
  )

  const resolvedKey =
    typeof resolved.key === 'string' ? resolved.key.trim() : ''
  if (!resolvedKey) {
    throw new Error('session not found')
  }

  return resolvedKey
}

function pickModel(
  entry: SessionEntry | undefined,
  resolved?: { model?: string } | null,
) {
  const direct =
    typeof entry?.modelOverride === 'string' ? entry.modelOverride.trim() : ''
  if (direct) return direct

  const resolvedModel =
    typeof resolved?.model === 'string' ? resolved.model.trim() : ''
  if (resolvedModel) return resolvedModel

  const fallback = typeof entry?.model === 'string' ? entry.model.trim() : ''
  return fallback || null
}

export const Route = createFileRoute('/api/model')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const rawSessionKey = url.searchParams.get('sessionKey')?.trim() ?? ''
          const friendlyId = url.searchParams.get('friendlyId')?.trim() ?? ''
          const sessionKey = await resolveSessionKey(rawSessionKey, friendlyId)

          const payload = await gatewayRpc<SessionsGetResponse>(
            'sessions.get',
            {
              key: sessionKey,
            },
          )

          const entry = payload.entry
          const fallbackListPayload =
            !entry && !payload.resolved
              ? await gatewayRpc<SessionsListResponse>('sessions.list', {
                  limit: 500,
                  includeGlobal: true,
                  includeUnknown: true,
                })
              : null
          const fallbackEntry = fallbackListPayload?.sessions?.find(
            (session) => session.key === sessionKey,
          )
          const model = pickModel(
            entry ?? fallbackEntry,
            payload.resolved ?? fallbackEntry?.resolved,
          )
          const modelProvider =
            payload.resolved?.modelProvider ??
            entry?.modelProvider ??
            fallbackEntry?.modelProvider ??
            fallbackEntry?.resolved?.modelProvider ??
            null

          return json({
            ok: true,
            sessionKey,
            model,
            modelProvider,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const status = message === 'session not found' ? 404 : 500
          return json({ ok: false, error: message }, { status })
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >
          const rawSessionKey =
            typeof body.sessionKey === 'string' ? body.sessionKey.trim() : ''
          const friendlyId =
            typeof body.friendlyId === 'string' ? body.friendlyId.trim() : ''
          const model = typeof body.model === 'string' ? body.model.trim() : ''
          const sessionKey = await resolveSessionKey(rawSessionKey, friendlyId)

          const payload = await gatewayRpc<SessionsPatchResponse>(
            'sessions.patch',
            {
              key: sessionKey,
              model: model || null,
            },
          )

          return json({
            ok: true,
            sessionKey: payload.key ?? sessionKey,
            model: pickModel(payload.entry, payload.resolved),
            modelProvider:
              payload.resolved?.modelProvider ??
              payload.entry?.modelProvider ??
              null,
            entry: payload.entry,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const status = message === 'session not found' ? 404 : 500
          return json({ ok: false, error: message }, { status })
        }
      },
    },
  },
})
