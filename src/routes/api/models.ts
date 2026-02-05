import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'

/**
 * API Route: /api/models
 *
 * Fetches available AI models from the OpenClaw Gateway.
 * Returns a list of models with their display names.
 */

type GatewayConfigResponse = {
  config?: {
    agents?: {
      defaults?: {
        model?: {
          primary?: string
          fallbacks?: string[]
        }
        models?: Record<string, {
          alias?: string
          params?: Record<string, unknown>
        }>
      }
    }
    chat?: {
      defaultModel?: string
      models?: Array<{
        id: string
        name?: string
        provider?: string
        enabled?: boolean
      }>
    }
    model?: {
      defaultModel?: string
      allowed?: string[]
    }
  }
}

type ModelInfo = {
  id: string
  name: string
  provider?: string
}

function parseModelName(modelId: string): string {
  // Extract a friendly name from model ID
  // e.g., "anthropic/claude-sonnet-4" -> "Claude Sonnet 4"
  //       "openai/gpt-4" -> "GPT-4"
  const parts = modelId.split('/')
  const model = parts.length > 1 ? parts[1] : parts[0]
  
  // Capitalize and clean up
  return model
    .split('-')
    .map(word => {
      // Keep known acronyms uppercase
      if (['gpt', 'ai', 'api'].includes(word.toLowerCase())) {
        return word.toUpperCase()
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export const Route = createFileRoute('/api/models')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Try to get model configuration from Gateway
          const res = await gatewayRpc<GatewayConfigResponse>('config.get', {
            keys: ['agents', 'chat', 'model'],
          })

          const models: ModelInfo[] = []

          // Primary source: agents.defaults.models (OpenClaw's actual config structure)
          if (res.config?.agents?.defaults?.models) {
            const agentModels = res.config.agents.defaults.models
            for (const [modelId, modelConfig] of Object.entries(agentModels)) {
              models.push({
                id: modelId,
                name: modelConfig.alias 
                  ? `${modelConfig.alias.charAt(0).toUpperCase() + modelConfig.alias.slice(1)} (${parseModelName(modelId)})`
                  : parseModelName(modelId),
                provider: modelId.split('/')[0],
              })
            }
          }

          // Fallback: try chat.models array
          if (models.length === 0 && res.config?.chat?.models && Array.isArray(res.config.chat.models)) {
            for (const model of res.config.chat.models) {
              if (model.enabled !== false && model.id) {
                models.push({
                  id: model.id,
                  name: model.name || parseModelName(model.id),
                  provider: model.provider,
                })
              }
            }
          }

          // Fallback: try model.allowed array
          if (models.length === 0 && res.config?.model?.allowed) {
            for (const modelId of res.config.model.allowed) {
              models.push({
                id: modelId,
                name: parseModelName(modelId),
              })
            }
          }

          // Get default model
          const defaultModel =
            res.config?.agents?.defaults?.model?.primary ||
            res.config?.chat?.defaultModel ||
            res.config?.model?.defaultModel ||
            models[0]?.id ||
            ''

          return json({
            ok: true,
            models,
            defaultModel,
          })
        } catch (err) {
          console.error('[models] Error fetching models:', err)
          
          // Return a minimal fallback instead of erroring completely
          return json({
            ok: true,
            models: [
              {
                id: 'default',
                name: 'Default Model',
              },
            ],
            defaultModel: 'default',
          })
        }
      },
    },
  },
})
