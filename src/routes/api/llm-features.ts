import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  generateFollowUpsViaOpenclaw,
  generateTitleViaOpenclaw,
  isOpenclawAvailable,
} from '../../lib/openclaw-client'

/**
 * API Routes: /api/llm-features
 *
 * Endpoints for OpenClaw-powered title generation and follow-up suggestions.
 */

type TitleRequest = {
  message: string
}

type FollowUpsRequest = {
  conversationContext: string
}

type StatusResponse = {
  ok: boolean
  available: boolean
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

/**
 * Generate heuristic title from first message
 * Extracts first 5-6 meaningful words
 */
function generateHeuristicTitle(message: string): string {
  let text = message.replace(/```[\s\S]*?```/g, ' ')
  text = text.replace(/`[^`]+`/g, ' ')
  text = text.replace(/https?:\/\/[^\s]+/g, ' ')
  text = text.replace(/[^\w\s.,!?'-]/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()

  const words = text.split(/\s+/).filter((word) => {
    if (
      word.length <= 2 &&
      !['AI', 'ML', 'UI', 'UX', 'API', 'CSS', 'JS'].includes(word.toUpperCase())
    ) {
      return false
    }
    return true
  })

  const titleWords = words.slice(0, 6)
  let title = titleWords.join(' ')
  title = title.replace(/[.,!?]+$/, '')

  if (title.length > 60) {
    title = title.slice(0, 57) + '...'
  }

  return title || message.slice(0, 50)
}

export const Route = createFileRoute('/api/llm-features')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const available = await isOpenclawAvailable()
          return json<StatusResponse>({
            ok: true,
            available,
          })
        } catch (err) {
          return json<StatusResponse>({
            ok: false,
            available: false,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      },

      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
          const action = body.action as string

          switch (action) {
            case 'title': {
              const { message } = body as TitleRequest & { action: string }

              if (!message || typeof message !== 'string' || message.trim().length < 3) {
                return json<TitleResponse>(
                  {
                    ok: false,
                    error: 'Message is required and must be at least 3 characters',
                  },
                  { status: 400 },
                )
              }

              try {
                const title = await generateTitleViaOpenclaw(message)
                return json<TitleResponse>({
                  ok: true,
                  title,
                  source: 'openclaw',
                })
              } catch (err) {
                console.error('[llm-features] Title generation error:', err)
                return json<TitleResponse>({
                  ok: true,
                  title: generateHeuristicTitle(message),
                  source: 'heuristic',
                  error: err instanceof Error ? err.message : 'OpenClaw error, used heuristic',
                })
              }
            }

            case 'followups': {
              const { conversationContext } = body as FollowUpsRequest & { action: string }

              if (
                !conversationContext ||
                typeof conversationContext !== 'string' ||
                conversationContext.trim().length < 10
              ) {
                return json<FollowUpsResponse>({
                  ok: true,
                  suggestions: [],
                  source: 'heuristic',
                })
              }

              try {
                const suggestions = await generateFollowUpsViaOpenclaw(conversationContext)
                return json<FollowUpsResponse>({
                  ok: true,
                  suggestions,
                  source: 'openclaw',
                })
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
              const available = await isOpenclawAvailable()
              return json<StatusResponse>({
                ok: true,
                available,
              })
            }

            default:
              return json(
                {
                  ok: false,
                  error: `Unknown action: ${action}. Valid actions: title, followups, test`,
                },
                { status: 400 },
              )
          }
        } catch (err) {
          console.error('[llm-features] Error:', err)
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
