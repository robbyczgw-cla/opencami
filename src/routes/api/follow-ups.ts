import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'

/**
 * API Route: /api/follow-ups
 *
 * Generates contextual follow-up suggestions using the LLM via the OpenClaw Gateway.
 * Returns 3 suggestions based on the assistant's last response and conversation context.
 */

const FOLLOW_UP_SYSTEM_PROMPT = `You are a helpful assistant that generates follow-up question suggestions.
Given the assistant's last response, generate exactly 3 short, natural follow-up questions the user might want to ask.

Rules:
- Each suggestion should be a single, concise question (under 60 characters preferred)
- Make them contextually relevant to the response
- Vary the types: clarification, deeper exploration, practical application
- Use natural, conversational language
- Do not number them or add any prefix

Output format: Return ONLY the 3 questions, one per line, nothing else.`

type FollowUpRequest = {
  responseText: string
  contextSummary?: string
}

type ChatCompleteResponse = {
  content?: string
  message?: { content?: string }
  choices?: Array<{ message?: { content?: string } }>
}

function parseFollowUps(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    // Remove any numbered prefixes like "1." or "1)"
    .map((line) => line.replace(/^\d+[.)\s]+/, '').trim())
    // Remove bullet points
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    // Remove quotes
    .map((line) => line.replace(/^["']|["']$/g, '').trim())
    .filter((line) => line.length > 0 && line.length < 150)

  return lines.slice(0, 3)
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

          // Truncate to keep the request fast - we only need enough context
          const truncatedResponse =
            responseText.length > 1500
              ? responseText.slice(0, 1500) + '...'
              : responseText

          const contextSummary =
            typeof body.contextSummary === 'string'
              ? body.contextSummary.slice(0, 500)
              : ''

          const userPrompt = contextSummary
            ? `Context: ${contextSummary}\n\nAssistant's response:\n${truncatedResponse}`
            : `Assistant's response:\n${truncatedResponse}`

          // Use chat.complete for a lightweight, fast completion
          // Using a fast model and low token limit for speed
          const res = await gatewayRpc<ChatCompleteResponse>('chat.complete', {
            messages: [
              { role: 'system', content: FOLLOW_UP_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            maxTokens: 200,
            temperature: 0.7,
            // Use session's default model (no hardcoding!)
          })

          // Handle various response formats from the gateway
          const content =
            res.content ||
            res.message?.content ||
            res.choices?.[0]?.message?.content ||
            ''

          const suggestions = parseFollowUps(content)

          return json({ ok: true, suggestions })
        } catch (err) {
          console.error('[follow-ups] Error generating suggestions:', err)
          // Return empty array on error - the client will use fallback suggestions
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
