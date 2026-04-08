import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { generateFollowUpsViaOpenclaw } from '../../lib/openclaw-client'

/**
 * API Route: /api/follow-ups
 *
 * Generates contextual follow-up suggestions using the OpenClaw Gateway.
 * Returns 3 suggestions based on the assistant's last response.
 */

type FollowUpRequest = {
  responseText: string
  contextSummary?: string
}

export const Route = createFileRoute('/api/follow-ups')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as FollowUpRequest

          const responseText =
            typeof body.responseText === 'string' ? body.responseText.trim() : ''

          if (!responseText || responseText.length < 30) {
            return json({ ok: true, suggestions: [] })
          }

          const contextSummary =
            typeof body.contextSummary === 'string'
              ? body.contextSummary.slice(0, 500)
              : undefined

          const { suggestions } = await generateFollowUpsViaOpenclaw(
            responseText,
            contextSummary,
          )

          return json({ ok: true, suggestions })
        } catch (err) {
          console.error('[follow-ups] Error generating suggestions:', err)
          return json({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
            suggestions: [],
          })
        }
      },
    },
  },
})
