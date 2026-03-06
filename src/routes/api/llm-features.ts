import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  generateSessionTitle,
  generateFollowUps,
  testApiKey,
} from '../../lib/llm-client'

/**
 * API Routes: /api/llm-features
 * 
 * Endpoints for LLM-enhanced features using OpenAI API.
 * Supports both user-provided API key (from request header) and
 * server environment variable OPENAI_API_KEY.
 */

type TitleRequest = {
  message: string
}

type FollowUpsRequest = {
  conversationContext: string
}

type StatusResponse = {
  ok: boolean
  hasEnvKey: boolean
  hasOpenRouterKey?: boolean
  hasKilocodeKey?: boolean
  error?: string
}

type TitleResponse = {
  ok: boolean
  title?: string
  source?: 'llm' | 'heuristic'
  error?: string
}

type FollowUpsResponse = {
  ok: boolean
  suggestions?: string[]
  source?: 'llm' | 'heuristic'
  error?: string
}

type TestKeyResponse = {
  ok: boolean
  valid?: boolean
  error?: string
}

/**
 * Get API key from request header or environment
 * Priority: Header (user-provided) > Environment variable
 */
type LlmConfig = {
  apiKey: string | null
  baseUrl: string | null
  model: string | null
  error: string | null
}

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
const PRESET_BASE_URL_ORIGINS = new Set([
  'https://api.openai.com',
  'https://openrouter.ai',
  'https://api.kilo.ai',
  'http://localhost:11434',
  'http://127.0.0.1:11434',
])

function getOrigin(rawBaseUrl: string): string | null {
  try {
    return new URL(rawBaseUrl).origin
  } catch {
    return null
  }
}

function isAllowedClientBaseUrl(rawBaseUrl: string): boolean {
  const parsed = new URL(rawBaseUrl)
  if (!['http:', 'https:'].includes(parsed.protocol)) return false
  if (parsed.username || parsed.password) return false

  const hostname = parsed.hostname.toLowerCase()
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  if (!isLocalHost && parsed.protocol !== 'https:') return false

  const origin = parsed.origin
  if (PRESET_BASE_URL_ORIGINS.has(origin)) return true

  const envBaseUrl = process.env.LLM_BASE_URL?.trim()
  const envOrigin = envBaseUrl ? getOrigin(envBaseUrl) : null
  return Boolean(envOrigin && envOrigin === origin)
}

function detectProvider(rawBaseUrl: string | null): 'openai' | 'openrouter' | 'kilocode' {
  const baseUrl = rawBaseUrl?.toLowerCase() || ''
  if (baseUrl.includes('openrouter.ai')) return 'openrouter'
  if (baseUrl.includes('kilo.ai')) return 'kilocode'
  return 'openai'
}

function getLlmConfig(request: Request): LlmConfig {
  // API key: header > env provider key
  const headerKey = request.headers.get('X-OpenAI-API-Key')
  const headerBaseUrl = request.headers.get('X-LLM-Base-URL')?.trim() || null
  const envBaseUrl = process.env.LLM_BASE_URL?.trim() || null

  if (headerBaseUrl) {
    const origin = getOrigin(headerBaseUrl)
    if (!origin || !isAllowedClientBaseUrl(headerBaseUrl)) {
      return {
        apiKey: null,
        baseUrl: null,
        model: null,
        error: 'Disallowed X-LLM-Base-URL value',
      }
    }
  }

  const baseUrl = headerBaseUrl || envBaseUrl || DEFAULT_OPENAI_BASE_URL
  const provider = detectProvider(baseUrl)
  const envKey = provider === 'openrouter'
    ? (process.env.OPENROUTER_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim())
    : provider === 'kilocode'
      ? (process.env.KILOCODE_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim())
      : process.env.OPENAI_API_KEY?.trim()
  const apiKey = headerKey?.trim() || envKey || null

  // Model: header > env default
  const model = request.headers.get('X-LLM-Model')?.trim() || process.env.LLM_MODEL?.trim() || null

  return { apiKey, baseUrl, model, error: null }
}


/**
 * Generate heuristic title from first message
 * Extracts first 5-6 meaningful words
 */
function generateHeuristicTitle(message: string): string {
  // Remove code blocks
  let text = message.replace(/```[\s\S]*?```/g, ' ')
  // Remove inline code
  text = text.replace(/`[^`]+`/g, ' ')
  // Remove URLs
  text = text.replace(/https?:\/\/[^\s]+/g, ' ')
  // Remove special characters but keep basic punctuation
  text = text.replace(/[^\w\s.,!?'-]/g, ' ')
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim()

  // Split into words and take first meaningful ones
  const words = text.split(/\s+/).filter((word) => {
    // Filter out very short words unless they're important
    if (word.length <= 2 && !['AI', 'ML', 'UI', 'UX', 'API', 'CSS', 'JS'].includes(word.toUpperCase())) {
      return false
    }
    return true
  })

  // Take first 5-6 words
  const titleWords = words.slice(0, 6)
  
  // Join and clean up
  let title = titleWords.join(' ')
  
  // Remove trailing punctuation except for meaningful ones
  title = title.replace(/[.,!?]+$/, '')
  
  // Truncate if too long
  if (title.length > 60) {
    title = title.slice(0, 57) + '...'
  }

  return title || message.slice(0, 50)
}

export const Route = createFileRoute('/api/llm-features')({
  server: {
    handlers: {
      /**
       * GET /api/llm-features - Check LLM features status
       */
      GET: async () => {
        try {
          const hasEnvKey = Boolean(process.env.OPENAI_API_KEY?.trim())
          const hasOpenRouterKey = Boolean(process.env.OPENROUTER_API_KEY?.trim())
          const hasKilocodeKey = Boolean(process.env.KILOCODE_API_KEY?.trim())
          
          return json({
            ok: true,
            hasEnvKey,
            hasOpenRouterKey,
            hasKilocodeKey,
          })
        } catch (err) {
          return json<StatusResponse>({
            ok: false,
            hasEnvKey: false,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      },

      /**
       * POST /api/llm-features - Handle LLM feature requests
       * 
       * Request body should include an "action" field:
       * - action: "title" - Generate session title
       * - action: "followups" - Generate follow-up suggestions
       * - action: "test" - Test API key validity
       */
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

              const llmConfig = getLlmConfig(request)
              if (llmConfig.error) {
                return json<TitleResponse>({
                  ok: false,
                  error: llmConfig.error,
                }, { status: 400 })
              }
              
              // If no API key and no Ollama-style local provider, use heuristic
              if (!llmConfig.apiKey && !llmConfig.baseUrl?.includes('localhost')) {
                const title = generateHeuristicTitle(message)
                return json<TitleResponse>({
                  ok: true,
                  title,
                  source: 'heuristic',
                })
              }

              try {
                const title = await generateSessionTitle(message, {
                  apiKey: llmConfig.apiKey || '',
                  ...(llmConfig.baseUrl ? { baseUrl: llmConfig.baseUrl } : {}),
                  ...(llmConfig.model ? { model: llmConfig.model } : {}),
                })
                return json<TitleResponse>({
                  ok: true,
                  title,
                  source: 'llm',
                })
              } catch (err) {
                // Fall back to heuristic on error
                console.error('[llm-features] Title generation error:', err)
                const title = generateHeuristicTitle(message)
                return json<TitleResponse>({
                  ok: true,
                  title,
                  source: 'heuristic',
                  error: err instanceof Error ? err.message : 'LLM error, used heuristic',
                })
              }
            }

            case 'followups': {
              const { conversationContext } = body as FollowUpsRequest & { action: string }
              
              if (!conversationContext || typeof conversationContext !== 'string' || conversationContext.trim().length < 10) {
                return json<FollowUpsResponse>({
                  ok: true,
                  suggestions: [],
                  source: 'heuristic',
                })
              }

              const llmConfig = getLlmConfig(request)
              if (llmConfig.error) {
                return json<FollowUpsResponse>({
                  ok: false,
                  error: llmConfig.error,
                }, { status: 400 })
              }
              
              // If no API key and no local provider, return empty
              if (!llmConfig.apiKey && !llmConfig.baseUrl?.includes('localhost')) {
                return json<FollowUpsResponse>({
                  ok: true,
                  suggestions: [],
                  source: 'heuristic',
                })
              }

              try {
                const suggestions = await generateFollowUps(conversationContext, {
                  apiKey: llmConfig.apiKey || '',
                  ...(llmConfig.baseUrl ? { baseUrl: llmConfig.baseUrl } : {}),
                  ...(llmConfig.model ? { model: llmConfig.model } : {}),
                })
                return json<FollowUpsResponse>({
                  ok: true,
                  suggestions,
                  source: 'llm',
                })
              } catch (err) {
                console.error('[llm-features] Follow-ups generation error:', err)
                return json<FollowUpsResponse>({
                  ok: true,
                  suggestions: [],
                  source: 'heuristic',
                  error: err instanceof Error ? err.message : 'LLM error',
                })
              }
            }

            case 'test': {
              const llmConfig = getLlmConfig(request)
              if (llmConfig.error) {
                return json<TestKeyResponse>({
                  ok: false,
                  error: llmConfig.error,
                }, { status: 400 })
              }
              
              if (!llmConfig.apiKey && !llmConfig.baseUrl?.includes('localhost')) {
                return json<TestKeyResponse>({
                  ok: false,
                  error: 'API key required (or use Ollama for keyless access)',
                })
              }

              try {
                const valid = await testApiKey({
                  apiKey: llmConfig.apiKey || '',
                  ...(llmConfig.baseUrl ? { baseUrl: llmConfig.baseUrl } : {}),
                  ...(llmConfig.model ? { model: llmConfig.model } : {}),
                })
                return json<TestKeyResponse>({
                  ok: true,
                  valid,
                })
              } catch (err) {
                return json<TestKeyResponse>({
                  ok: true,
                  valid: false,
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
