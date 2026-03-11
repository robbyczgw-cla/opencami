import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'

type ChatHistoryResponse = {
  sessionKey: string
  sessionId?: string
  messages: Array<any>
  thinkingLevel?: string
  hasMore?: boolean
}

type SessionsResolveResponse = {
  ok?: boolean
  key?: string
}

export const Route = createFileRoute('/api/history')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const limit = Number(url.searchParams.get('limit') || '50')
          const rawSessionKey = url.searchParams.get('sessionKey')?.trim()
          const friendlyId = url.searchParams.get('friendlyId')?.trim()
          const before = url.searchParams.get('before')?.trim() || undefined

          let sessionKey =
            rawSessionKey && rawSessionKey.length > 0 ? rawSessionKey : ''

          if (!sessionKey && friendlyId) {
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
            if (resolvedKey.length === 0) {
              return json({ error: 'session not found' }, { status: 404 })
            }
            sessionKey = resolvedKey
          }

          if (sessionKey.length === 0) {
            sessionKey = 'main'
          }

          const params: Record<string, unknown> = { sessionKey, limit }
          if (before) params.before = before

          const payload = await gatewayRpc<ChatHistoryResponse>(
            'chat.history',
            params,
          )

          // Infer hasMore: if the gateway returned exactly `limit` messages,
          // there are likely more. The gateway may also set hasMore explicitly.
          const hasMore = payload.hasMore ?? payload.messages.length >= limit

          return json({ ...payload, hasMore })
        } catch (err) {
          return json(
            {
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
