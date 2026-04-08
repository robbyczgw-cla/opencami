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

const OPENCLAW_GATEWAY_URL =
  (process.env.CLAWDBOT_GATEWAY_URL?.replace(/^ws/, 'http') ?? 'http://127.0.0.1:18789') +
  '/v1/chat/completions'
const OPENCLAW_MODEL_OVERRIDE =
  process.env.OPENCAMI_LLM_FEATURES_MODEL?.trim() ||
  process.env.OPENCLAW_LLM_FEATURES_MODEL?.trim() ||
  ''
const OPENCLAW_MODEL_FALLBACKS = OPENCLAW_MODEL_OVERRIDE
  ? [OPENCLAW_MODEL_OVERRIDE]
  : ['openclaw/gpt54mini', 'openclaw']
const DEFAULT_TIMEOUT_MS = 30000

function getGatewayToken(): string | null {
  return (
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
    process.env.CLAWDBOT_GATEWAY_TOKEN?.trim() ||
    null
  )
}

async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number
    temperature?: number
    timeoutMs?: number
    model?: string
  },
): Promise<string> {
  const token = getGatewayToken()
  let lastError: Error | null = null
  const models = options?.model ? [options.model] : OPENCLAW_MODEL_FALLBACKS

  for (const model of models) {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )

    try {
      const response = await fetch(OPENCLAW_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options?.maxTokens ?? 200,
          temperature: options?.temperature ?? 0.7,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        lastError = new Error(
          `OpenClaw Gateway error (${model}): ${response.status}${errorText ? ` ${errorText}` : ''}`,
        )
        continue
      }

      const data = (await response.json()) as ChatCompletionResponse
      const content = data.choices?.[0]?.message?.content?.trim() || ''
      if (!content) {
        lastError = new Error(`OpenClaw Gateway returned empty content for ${model}`)
        continue
      }

      return content
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`OpenClaw Gateway request timed out for ${model}`)
        continue
      }
      lastError = error instanceof Error ? error : new Error(String(error))
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw lastError || new Error('OpenClaw Gateway request failed for all models')
}

function dedupeFollowUps(lines: string[]): string[] {
  const seen = new Set<string>()

  return lines.filter((line) => {
    const key = line.toLocaleLowerCase('de-DE')
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function looksLikeQuestion(line: string): boolean {
  if (line.endsWith('?')) return true
  if (line.length < 8 || line.length > 90) return false
  if (/[.!:]$/.test(line)) return false
  if (/\b(?:ja|nein|ok|okay|danke|bitte)\b/i.test(line)) return false

  return /^(?:wie|was|warum|wieso|weshalb|wo|wohin|woher|wann|welche(?:r|s|n)?|welcher|welches|welchen|wer|wen|wem|kann(?:st)?|könn(?:te|test)|soll(?:te|st)|möcht(?:est|et)|willst|gibt|brauche|zeigt|erklär|hilf|nenn|sag)\b/i.test(
    line,
  )
}

function parseFollowUps(text: string): string[] {
  const candidates = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^["']|["']$/g, '').trim())
    .map((line) => line.replace(/^\d+[.)\s]+/, '').trim())
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .map((line) => line.replace(/\s+/g, ' '))
    .filter((line) => line.length > 0 && line.length < 150)
    .filter((line) => !/[`*_#]/.test(line))
    .filter((line) => !/^#{1,6}\s/.test(line))

  const explicitQuestions = candidates.filter((line) => line.endsWith('?'))
  const inferredQuestions = candidates.filter((line) => looksLikeQuestion(line))

  const inlineQuestions =
    text.match(/[^\n?.!]*\?/g)?.map((line) => line.trim()) ?? []

  return dedupeFollowUps([
    ...explicitQuestions,
    ...inferredQuestions,
    ...inlineQuestions,
  ]).slice(0, 3)
}

export async function generateTitleViaOpenclaw(
  message: string,
  model?: string,
): Promise<string> {
  const systemPrompt = `You are a title generator. Output ONLY a short title, nothing else.
Rules:
- 3-6 words maximum
- No quotes, no punctuation at the end
- No explanation, no markdown
- Just the title text
- Use the same language as the input

Example: "Nginx Reverse Proxy Setup"` 

  return chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    { maxTokens: 60, temperature: 0.3, model },
  )
}

export async function generateFollowUpsViaOpenclaw(
  responseText: string,
  contextSummary?: string,
  model?: string,
): Promise<string[]> {
  const truncatedResponse =
    responseText.length > 1500 ? `${responseText.slice(0, 1500)}...` : responseText
  const trimmedSummary = contextSummary?.slice(0, 500).trim() || ''

  const userPrompt = trimmedSummary
    ? `Context: ${trimmedSummary}\n\nAssistant's response:\n${truncatedResponse}`
    : `Assistant's response:\n${truncatedResponse}`

  const systemPrompt = `You generate follow-up suggestions for a chat UI.

Return exactly 3 short follow-up QUESTIONS in the SAME LANGUAGE as the conversation context.

Hard rules:
- Output exactly 3 lines
- Every line must be a natural question in the same language as the input
- No markdown
- No bullet points
- No numbering
- No asterisks
- No explanations
- No intro or outro text
- No quotes
- Keep each question concise and relevant
- Prefer under 60 characters when possible
- Vary them across clarification, deeper detail, and practical use

Example output for English input:
How exactly does this work?
When would you typically use this?
What should I watch out for in practice?

Example output for German input:
Wie funktioniert das genau?
Wann wird das typischerweise verwendet?
Worauf sollte ich in der Praxis achten?`

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 200, temperature: 0.2, model },
  )

  return parseFollowUps(response)
}

export async function isOpenclawAvailable(): Promise<boolean> {
  try {
    await chatCompletion([{ role: 'user', content: 'Hi' }], {
      maxTokens: 1,
      temperature: 0,
      timeoutMs: 10000,
    })
    return true
  } catch {
    return false
  }
}
