import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  generateTitleViaOpenclaw,
  generateFollowUpsViaOpenclaw,
} from '../../lib/openclaw-client'

/**
 * API Routes: /api/llm-features
 *
 * Endpoints for LLM-enhanced features using the OpenClaw Gateway.
 * Routes inference through the locally configured OpenClaw providers.
 * No external API key required.
 *
 * Environment variables:
 *   OPENCLAW_GATEWAY_URL     - Gateway URL (default: http://127.0.0.1:18789)
 *   OPENCLAW_GATEWAY_TOKEN   - Gateway auth token
 *   CLAWDBOT_GATEWAY_TOKEN   - Alias for gateway auth token (backward compat)
 */

type TitleRequest = {
  message: string
}

type FollowUpsRequest = {
  conversationContext: string
}

type StatusResponse = {
  ok: boolean
  error?: string
}

type TitleResponse = {
  ok: boolean
  title?: string
  source?: 'openclaw' | 'heuristic'
  error?: string
}

type FollowUpsResponse = {
  ok: boolean
  suggestions?: string[]
  source?: 'openclaw' | 'heuristic'
  error?: string
}

type TestKeyResponse = {
  ok: boolean
  valid?: boolean
  error?: string
}

/**
 * Generate a simple heuristic title from message text (last resort fallback)
 */
function generateHeuristicTitle(message: string): string {
  let text = message.replace(/```[\s\S]*?```/g, ' ')
  text = text.replace(/`[^`]+`/g, ' ')
  text = text.replace(/https?:\/\/[^\s]+/g, ' ')
  text = text.replace(/[^\w\s.,!?'-]/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()

  const words = text.split(/\s+/).filter((word) => {
    if (word.length <= 2) {
      return ['AI', 'ML', 'UI', 'UX', 'API', 'CSS', 'JS'].includes(word.toUpperCase())
    }
    return true
  })

  let title = words.slice(0, 6).join(' ').replace(/[.,!?]+$/, '')
  if (title.length > 60) title = title.slice(0, 57) + '...'
  return title || message.slice(0, 50)
}

export const Route = createFileRoute('/api/llm-features')({
  server: {
    handlers: {
      GET: async () => {
        return json<StatusResponse>({ ok: true })
      },

      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({})) as Record<string, unknown>
          const action = body.action as string

          switch (action) {
            case 'title': {
              const { message } = body as TitleRequest & { action: string }

              if (!message || typeof message !== 'string' || message.trim().length < 3) {
                return json<TitleResponse>({
                  ok: false,
                  error: 'Message is required and must be at least 3 characters',
                })
              }

              try {
                const { title, source } = await generateTitleViaOpenclaw(message)
                return json<TitleResponse>({ ok: true, title, source })
              } catch (err) {
                console.error('[llm-features] Title generation error:', err)
                const title = generateHeuristicTitle(message)
                return json<TitleResponse>({
                  ok: true,
                  title,
                  source: 'heuristic',
                  error: err instanceof Error ? err.message : 'OpenClaw error, used heuristic',
                })
              }
            }

            case 'followups': {
              const { conversationContext } = body as FollowUpsRequest & { action: string }

              if (!conversationContext || typeof conversationContext !== 'string' || conversationContext.trim().length < 10) {
                return json<FollowUpsResponse>({ ok: true, suggestions: [], source: 'heuristic' })
              }

              try {
                const { suggestions, source } = await generateFollowUpsViaOpenclaw(conversationContext)
                return json<FollowUpsResponse>({ ok: true, suggestions, source })
              } catch (err) {
                console.error('[llm-features] Follow-ups generation error:', err)
                return json<FollowUpsResponse>({
                  ok: true,
                  suggestions: [],
                  source: 'heuristic',
                  error: err instanceof Error ? err.message : 'OpenClaw error',
                })
              }
            }

            case 'test': {
              // Simple connectivity test — just check if gateway responds
              try {
                const { isOpenclawAvailable } = await import('../../lib/openclaw-client')
                const available = await isOpenclawAvailable()
                return json<TestKeyResponse>({ ok: true, valid: available })
              } catch (err) {
                return json<TestKeyResponse>({
                  ok: false,
                  error: err instanceof Error ? err.message : 'Test failed',
                })
              }
            }

            default:
              return json({
                ok: false,
                error: `Unknown action: ${action}. Valid actions: title, followups, test`,
              }, { status: 400 })
          }
        } catch (err) {
          console.error('[llm-features] Error:', err)
          return json({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }, { status: 500 })
        }
      },
    },
  },
})
