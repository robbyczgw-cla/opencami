/**
 * OpenAI API Client for LLM-enhanced features
 * 
 * Used for generating smart session titles and contextual follow-up suggestions.
 * API key is passed from the backend (never exposed to frontend).
 */

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatCompletionResponse = {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export type LlmClientOptions = {
  apiKey: string
  baseUrl?: string
  model?: string
  timeoutMs?: number
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4.1-nano'
const DEFAULT_TIMEOUT_MS = 10000

/**
 * Make a chat completion request to OpenAI API
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: LlmClientOptions & { maxTokens?: number },
): Promise<string> {
  const {
    apiKey,
    baseUrl = DEFAULT_BASE_URL,
    model = DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxTokens = 100,
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
    }

    const data = await response.json() as ChatCompletionResponse
    return data.choices[0]?.message?.content?.trim() || ''
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenAI API request timed out')
    }
    throw error
  }
}

/**
 * Generate a smart session title from the first message
 */
export async function generateSessionTitle(
  message: string,
  options: LlmClientOptions,
): Promise<string> {
  const systemPrompt = `Generate a concise 3-6 word title for this conversation. 
Rules:
- No quotes or punctuation at the end
- Capture the main topic/intent
- Be specific, not generic
- Use title case`

  return chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    { ...options, maxTokens: 25 },
  )
}

/**
 * Generate contextual follow-up suggestions
 */
export async function generateFollowUps(
  conversationContext: string,
  options: LlmClientOptions,
): Promise<string[]> {
  const systemPrompt = `Based on this conversation, suggest 3 natural follow-up questions the user might ask.
Rules:
- Each question max 10 words
- Make them specific to the conversation context
- Vary the types: clarification, deeper dive, related topic
- Return ONLY a JSON array of 3 strings, nothing else`

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: conversationContext },
    ],
    { ...options, maxTokens: 150 },
  )

  try {
    // Parse JSON response, handling potential markdown code blocks
    let jsonStr = response.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3).map(String)
    }
  } catch {
    // If parsing fails, return empty array (will fallback to heuristic)
  }
  return []
}

/**
 * Test if an API key is valid
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    await chatCompletion(
      [{ role: 'user', content: 'Hi' }],
      { apiKey, maxTokens: 1, timeoutMs: 5000 },
    )
    return true
  } catch {
    return false
  }
}
