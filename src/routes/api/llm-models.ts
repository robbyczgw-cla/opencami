import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

type GatewayModelsResponse = {
  data?: Array<{
    id?: string
  }>
}

type LlmModelInfo = {
  id: string
  agentId: string
  displayName: string
}

const ALLOWED_AGENT_IDS = new Set([
  'main',
  'codex',
  'gpt54',
  'gpt54mini',
  'kimi',
  'grok',
  'gemini',
  'gh-sonnet',
  'gh-haiku',
  'oc-mimo-pro',
  'oc-mimo-omni',
  'hermes',
])

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  main: 'Main (MiMo)',
  codex: 'Codex (GPT-5.4)',
  gpt54: 'GPT-5.4',
  gpt54mini: 'GPT-5.4 Mini',
  kimi: 'Kimi K2.5',
  grok: 'Grok 4.20',
  gemini: 'Gemini 3.1',
  'gh-sonnet': 'Claude Sonnet (GitHub)',
  'gh-haiku': 'Claude Haiku (GitHub)',
  'oc-mimo-pro': 'MiMo Pro',
  'oc-mimo-omni': 'MiMo Omni',
  hermes: 'Hermes',
}

const GATEWAY_MODELS_URL =
  (process.env.CLAWDBOT_GATEWAY_URL?.replace(/^ws/, 'http') ?? 'http://127.0.0.1:18789') +
  '/v1/models'

function getGatewayToken(): string | null {
  return (
    process.env.CLAWDBOT_GATEWAY_TOKEN?.trim() ||
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
    null
  )
}

export const Route = createFileRoute('/api/llm-models')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const token = getGatewayToken()
          const response = await fetch(GATEWAY_MODELS_URL, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })

          if (!response.ok) {
            const errorText = await response.text().catch(() => '')
            throw new Error(
              `Gateway models request failed: ${response.status}${errorText ? ` ${errorText}` : ''}`,
            )
          }

          const data = (await response.json()) as GatewayModelsResponse
          const seenAgentIds = new Set<string>()
          const models: LlmModelInfo[] = (data.data ?? [])
            .map((model) => model.id?.trim())
            .filter((id): id is string => Boolean(id?.startsWith('openclaw/')))
            .map((id) => {
              const agentId = id.slice('openclaw/'.length)
              return { id, agentId }
            })
            .filter(({ agentId }) => ALLOWED_AGENT_IDS.has(agentId))
            .filter(({ agentId }) => {
              if (seenAgentIds.has(agentId)) return false
              seenAgentIds.add(agentId)
              return true
            })
            .map(({ id, agentId }) => ({
              id,
              agentId,
              displayName: AGENT_DISPLAY_NAMES[agentId] ?? agentId,
            }))

          return json({
            ok: true,
            models,
            defaultModel: 'gpt54mini',
          })
        } catch (err) {
          console.error('[llm-models] Error fetching models:', err)
          return json(
            {
              ok: false,
              models: [
                {
                  id: 'openclaw/gpt54mini',
                  agentId: 'gpt54mini',
                  displayName: AGENT_DISPLAY_NAMES.gpt54mini,
                },
              ],
              defaultModel: 'gpt54mini',
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
