/**
 * openclaw-client.ts
 *
 * Client for the local OpenClaw Gateway HTTP API.
 * Uses the /v1/chat/completions endpoint with model="openclaw"
 * to route inference through the configured OpenClaw providers.
 *
 * No API key needed — uses the Gateway auth token from env.
 */

const OPENCLAW_GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const OPENCLAW_TOKEN =
  process.env.OPENCLAW_GATEWAY_TOKEN ||
  process.env.CLAWDBOT_GATEWAY_TOKEN ||
  ''

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatCompletionResponse = {
  choices: Array<{
    message: { content: string }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
  }
}

/**
 * Run a chat completion through the OpenClaw Gateway.
 * Uses model="openclaw" to route via the default configured agent/model.
 */
export async function openclawComplete(
  messages: ChatMessage[],
  options: {
    maxTokens?: number
    temperature?: number
    signal?: AbortSignal
  } = {},
): Promise<string> {
  const res = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(OPENCLAW_TOKEN ? { Authorization: `Bearer ${OPENCLAW_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      model: 'openclaw',
      messages,
      max_tokens: options.maxTokens ?? 150,
      temperature: options.temperature ?? 0.7,
    }),
    signal: options.signal,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`OpenClaw Gateway error ${res.status}: ${err}`)
  }

  const data = (await res.json()) as ChatCompletionResponse
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenClaw Gateway returned empty response')
  return content
}

/**
 * Generate a session title via OpenClaw Gateway.
 * Returns { title, source: 'openclaw' }
 */
export async function generateTitleViaOpenclaw(
  message: string,
  signal?: AbortSignal,
): Promise<{ title: string; source: 'openclaw' }> {
  const content = await openclawComplete(
    [
      {
        role: 'system',
        content:
          'Generate a short, descriptive chat session title (max 6 words, no quotes, no punctuation at end). Return ONLY the title, nothing else.',
      },
      {
        role: 'user',
        content: `First message: ${message.slice(0, 500)}`,
      },
    ],
    { maxTokens: 30, temperature: 0.5, signal },
  )

  const title = content.trim().replace(/^["']|["']$/g, '').slice(0, 64)
  return { title, source: 'openclaw' }
}

/**
 * Generate follow-up suggestions via OpenClaw Gateway.
 * Returns { suggestions: string[], source: 'openclaw' }
 */
export async function generateFollowUpsViaOpenclaw(
  responseText: string,
  contextSummary?: string,
  signal?: AbortSignal,
): Promise<{ suggestions: string[]; source: 'openclaw' }> {
  const userPrompt = contextSummary
    ? `Context: ${contextSummary.slice(0, 500)}\n\nAssistant's response:\n${responseText.slice(0, 1500)}`
    : `Assistant's response:\n${responseText.slice(0, 1500)}`

  const content = await openclawComplete(
    [
      {
        role: 'system',
        content: `Generate exactly 3 short follow-up questions the user might ask next.
Rules:
- Each question must be under 60 characters
- Make them contextually relevant
- Vary: clarification, deeper exploration, practical application
- Natural, conversational language
- No numbering, no bullet points, no quotes
Output: exactly 3 questions, one per line, nothing else.`,
      },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 150, temperature: 0.7, signal },
  )

  const suggestions = content
    .split('\n')
    .map((l) => l.trim().replace(/^\d+[.)]\s*/, '').replace(/^[-•*]\s*/, ''))
    .filter((l) => l.length > 5 && l.length < 150)
    .slice(0, 3)

  return { suggestions, source: 'openclaw' }
}

/**
 * Check if the OpenClaw Gateway is reachable.
 */
export async function isOpenclawAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/models`, {
      headers: OPENCLAW_TOKEN ? { Authorization: `Bearer ${OPENCLAW_TOKEN}` } : {},
      signal: AbortSignal.timeout(2000),
    })
    return res.ok
  } catch {
    return false
  }
}
