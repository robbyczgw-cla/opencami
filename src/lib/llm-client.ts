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
const DEFAULT_MODEL = 'gpt-5-nano'
const DEFAULT_TIMEOUT_MS = 10000

/**
 * Make a chat completion request to OpenAI API
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: LlmClientOptions & {
    maxCompletionTokens?: number
    temperature?: number
  },
): Promise<string> {
  const {
    apiKey,
    baseUrl = DEFAULT_BASE_URL,
    model = DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxCompletionTokens = 100,
    temperature = 0.7,
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
        max_completion_tokens: maxCompletionTokens,
        temperature,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      throw new Error(`OpenAI API error: ${response.status} ${errorBody}`)
    }

    const data = (await response.json()) as ChatCompletionResponse
    const content = data.choices?.[0]?.message?.content?.trim() || ''

    return content
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw err
  }
}

/**
 * Generate a smart session title from the first message
 */
export async function generateSessionTitle(
  firstMessage: string,
  options: LlmClientOptions,
): Promise<string> {
  const systemPrompt = `Generate a concise 3-6 word title for this conversation. Rules:
- No quotes around the title
- No punctuation at the end
- Be specific and descriptive
- Use title case
- Do not include filler words like "Help with" or "Question about"
- Just output the title, nothing else`

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: firstMessage.slice(0, 1000) },
    ],
    {
      ...options,
      maxCompletionTokens: 25,
      temperature: 0.7,
    },
  )

  // Clean up the title
  return content
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/[.!?]+$/, '') // Remove trailing punctuation
    .trim()
    .slice(0, 100) // Limit length
}

/**
 * Generate contextual follow-up suggestions
 */
export async function generateFollowUps(
  conversationContext: string,
  options: LlmClientOptions,
): Promise<string[]> {
  const systemPrompt = `Based on this conversation, suggest 3 short follow-up questions the user might ask.
Rules:
- Each question should be 3-8 words max
- Make them contextually relevant
- Vary the types: clarification, exploration, practical application
- Return ONLY a JSON array of 3 strings, nothing else
- Example: ["How do I implement this?", "What are the alternatives?", "Can you explain more?"]`

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: conversationContext.slice(0, 2000) },
    ],
    {
      ...options,
      maxCompletionTokens: 150,
      temperature: 0.8,
    },
  )

  // Parse JSON array from response
  try {
    // Try to extract JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length < 100)
          .slice(0, 3)
      }
    }
  } catch {
    // If JSON parsing fails, try to extract lines
    const lines = content
      .split('\n')
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').replace(/^["']|["']$/g, '').trim())
      .filter((line) => line.length > 0 && line.length < 100)
    return lines.slice(0, 3)
  }

  return []
}

/**
 * Test if an API key is valid by making a minimal request
 */
export async function testApiKey(apiKey: string, baseUrl?: string): Promise<boolean> {
  try {
    // Make a minimal request to test the key
    await chatCompletion(
      [{ role: 'user', content: 'Hi' }],
      {
        apiKey,
        baseUrl,
        maxCompletionTokens: 1,
        timeoutMs: 5000,
      },
    )
    return true
  } catch {
    return false
  }
}
