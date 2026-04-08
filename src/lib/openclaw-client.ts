type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const OPENCLAW_GATEWAY_URL = 'http://127.0.0.1:18789/v1/chat/completions'
const OPENCLAW_MODEL = 'openclaw'
const DEFAULT_TIMEOUT_MS = 10000

function getGatewayToken(): string | null {
  return (
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
    process.env.CLAWDBOT_GATEWAY_TOKEN?.trim() ||
    null
  )
}

async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; timeoutMs?: number },
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  )

  try {
    const token = getGatewayToken()
    const response = await fetch(OPENCLAW_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        model: OPENCLAW_MODEL,
        messages,
        max_tokens: options?.maxTokens ?? 200,
        temperature: options?.temperature ?? 0.7,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(
        `OpenClaw Gateway error: ${response.status}${errorText ? ` ${errorText}` : ''}`,
      )
    }

    const data = (await response.json()) as ChatCompletionResponse
    const content = data.choices?.[0]?.message?.content?.trim() || ''
    if (!content) {
      throw new Error('OpenClaw Gateway returned empty content')
    }

    return content
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenClaw Gateway request timed out')
    }
    throw error instanceof Error ? error : new Error(String(error))
  } finally {
    clearTimeout(timeoutId)
  }
}

function parseFollowUps(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^\d+[.)\s]+/, '').trim())
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .map((line) => line.replace(/^["']|["']$/g, '').trim())
    .filter((line) => line.length > 0 && line.length < 150)

  return lines.slice(0, 3)
}

export async function generateTitleViaOpenclaw(message: string): Promise<string> {
  const systemPrompt = `Generate a concise 3-6 word title for this conversation.
Rules:
- No quotes or punctuation at the end
- Capture the main topic or intent
- Be specific, not generic
- Use title case`

  return chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    { maxTokens: 60, temperature: 0.3 },
  )
}

export async function generateFollowUpsViaOpenclaw(
  responseText: string,
  contextSummary?: string,
): Promise<string[]> {
  const truncatedResponse =
    responseText.length > 1500 ? `${responseText.slice(0, 1500)}...` : responseText
  const trimmedSummary = contextSummary?.slice(0, 500).trim() || ''

  const userPrompt = trimmedSummary
    ? `Context: ${trimmedSummary}\n\nAssistant's response:\n${truncatedResponse}`
    : `Assistant's response:\n${truncatedResponse}`

  const systemPrompt = `You are a helpful assistant that generates follow-up question suggestions.
Given the assistant's last response, generate exactly 3 short, natural follow-up questions the user might want to ask.

Rules:
- Each suggestion should be a single, concise question (under 60 characters preferred)
- Make them contextually relevant to the response
- Vary the types: clarification, deeper exploration, practical application
- Use natural, conversational language
- Do not number them or add any prefix

Output format: Return ONLY the 3 questions, one per line, nothing else.`

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 200, temperature: 0.7 },
  )

  return parseFollowUps(response)
}

export async function isOpenclawAvailable(): Promise<boolean> {
  try {
    await chatCompletion([{ role: 'user', content: 'Hi' }], {
      maxTokens: 1,
      temperature: 0,
      timeoutMs: 5000,
    })
    return true
  } catch {
    return false
  }
}
