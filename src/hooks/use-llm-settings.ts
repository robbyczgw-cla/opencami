import { useCallback, useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * LLM Settings Hook
 * 
 * Manages settings for LLM-enhanced features:
 * - Smart session titles
 * - Smart follow-up suggestions
 * - OpenAI API key (stored in localStorage, sent via header)
 */

export type LlmSettings = {
  /** Use LLM for generating session titles */
  useLlmTitles: boolean
  /** Use LLM for generating follow-up suggestions */
  useLlmFollowUps: boolean
  /** LLM provider selection */
  llmProvider: 'openai' | 'openrouter' | 'ollama' | 'custom'
  /** Base URL override (empty uses provider default) */
  llmBaseUrl: string
  /** Model override (empty uses provider default) */
  llmModel: string
  /** User-provided API key (stored locally, never sent to server storage) */
  llmApiKey: string
}

type LlmSettingsState = {
  settings: LlmSettings
  updateSettings: (updates: Partial<LlmSettings>) => void
  clearApiKey: () => void
}

type LlmProviderDefaults = {
  baseUrl: string
  model: string
}

const LLM_PROVIDER_DEFAULTS: Record<LlmSettings['llmProvider'], LlmProviderDefaults> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-nano',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-oss-120b',
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
  },
  custom: {
    baseUrl: '',
    model: '',
  },
}

const DEFAULT_LLM_SETTINGS: LlmSettings = {
  useLlmTitles: true,
  useLlmFollowUps: true,
  llmProvider: 'openai',
  llmBaseUrl: '',
  llmModel: '',
  llmApiKey: '',
}

type PersistedLlmSettings = Partial<LlmSettings> & {
  openaiApiKey?: string
}

type PersistedLlmSettingsState = {
  settings?: PersistedLlmSettings
}

export function getLlmProviderDefaults(provider: LlmSettings['llmProvider']): LlmProviderDefaults {
  return LLM_PROVIDER_DEFAULTS[provider]
}

function getEffectiveLlmBaseUrl(settings: LlmSettings): string {
  if (settings.llmBaseUrl.trim()) return settings.llmBaseUrl.trim()
  return getLlmProviderDefaults(settings.llmProvider).baseUrl
}

function getEffectiveLlmModel(settings: LlmSettings): string {
  if (settings.llmModel.trim()) return settings.llmModel.trim()
  return getLlmProviderDefaults(settings.llmProvider).model
}

function getAvailability(settings: LlmSettings, hasEnvKey: boolean): boolean {
  if (settings.llmProvider === 'ollama') return true
  if (settings.llmProvider === 'custom') {
    return Boolean(settings.llmApiKey.trim()) || (settings.llmBaseUrl.trim() && settings.llmModel.trim())
  }
  return hasEnvKey || Boolean(settings.llmApiKey.trim())
}

function migratePersistedState(persistedState: unknown): PersistedLlmSettingsState {
  if (!persistedState || typeof persistedState !== 'object') {
    return { settings: DEFAULT_LLM_SETTINGS }
  }

  const { settings } = persistedState as PersistedLlmSettingsState
  if (!settings) {
    return { settings: DEFAULT_LLM_SETTINGS }
  }

  const { openaiApiKey, ...rest } = settings
  const llmApiKey = rest.llmApiKey ?? openaiApiKey ?? ''

  return {
    settings: {
      ...DEFAULT_LLM_SETTINGS,
      ...rest,
      llmApiKey,
    },
  }
}

export const useLlmSettingsStore = create<LlmSettingsState>()(
  persist(
    (set) => ({
      settings: {
        ...DEFAULT_LLM_SETTINGS,
      },
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      clearApiKey: () =>
        set((state) => ({
          settings: { ...state.settings, llmApiKey: '' },
        })),
    }),
    {
      name: 'llm-settings',
      version: 2,
      migrate: (persistedState) => migratePersistedState(persistedState),
    },
  ),
)

type LlmStatus = {
  hasEnvKey: boolean
  hasOpenRouterKey: boolean
  hasUserKey: boolean
  isAvailable: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Hook for accessing and managing LLM settings
 */
export function useLlmSettings() {
  const settings = useLlmSettingsStore((state) => state.settings)
  const updateSettings = useLlmSettingsStore((state) => state.updateSettings)
  const clearApiKey = useLlmSettingsStore((state) => state.clearApiKey)

  const [status, setStatus] = useState<LlmStatus>({
    hasEnvKey: false,
    hasOpenRouterKey: false,
    hasUserKey: Boolean(settings.llmApiKey),
    isAvailable: getAvailability(settings, false),
    isLoading: true,
    error: null,
  })

  // Check if server has environment API key
  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      try {
        const res = await fetch('/api/llm-features')
        if (!res.ok) throw new Error('Failed to check LLM status')
        
        const data = await res.json() as { ok: boolean; hasEnvKey: boolean; hasOpenRouterKey?: boolean }
        
        if (cancelled) return

        const hasUserKey = Boolean(settings.llmApiKey)
        const hasProviderKey = settings.llmProvider === 'openrouter' ? Boolean(data.hasOpenRouterKey) : data.hasEnvKey
        setStatus({
          hasEnvKey: data.hasEnvKey,
          hasOpenRouterKey: Boolean(data.hasOpenRouterKey),
          hasUserKey,
          isAvailable: getAvailability(settings, hasProviderKey),
          isLoading: false,
          error: null,
        })
      } catch (err) {
        if (cancelled) return
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to check status',
        }))
      }
    }

    void checkStatus()

    return () => {
      cancelled = true
    }
  }, [
    settings.llmApiKey,
    settings.llmProvider,
    settings.llmBaseUrl,
    settings.llmModel,
  ])

  // Test API key validity
  const testApiKey = useCallback(async (key: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const headers = buildLlmHeaders({
        ...settings,
        llmApiKey: key,
      })
      const res = await fetch('/api/llm-features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ action: 'test' }),
      })

      const data = await res.json() as { ok: boolean; valid?: boolean; error?: string }

      if (!data.ok) {
        return { valid: false, error: data.error || 'Test failed' }
      }

      return { valid: data.valid ?? false, error: data.error }
    } catch (err) {
      return { 
        valid: false, 
        error: err instanceof Error ? err.message : 'Network error',
      }
    }
  }, [settings])

  return {
    settings,
    updateSettings,
    clearApiKey,
    status,
    testApiKey,
  }
}

/**
 * Get the API key header for LLM requests
 * Returns headers object with X-OpenAI-API-Key if user has set a key
 */
function buildLlmHeaders(settings: LlmSettings): Record<string, string> {
  const apiKey = settings.llmApiKey
  const baseUrl = getEffectiveLlmBaseUrl(settings)
  const model = getEffectiveLlmModel(settings)
  if (apiKey) {
    return {
      'X-OpenAI-API-Key': apiKey,
      ...(baseUrl ? { 'X-LLM-Base-URL': baseUrl } : {}),
      ...(model ? { 'X-LLM-Model': model } : {}),
    }
  }
  return {
    ...(baseUrl ? { 'X-LLM-Base-URL': baseUrl } : {}),
    ...(model ? { 'X-LLM-Model': model } : {}),
  }
}

export function getLlmHeaders(): Record<string, string> {
  const settings = useLlmSettingsStore.getState().settings
  return buildLlmHeaders(settings)
}

/**
 * Check if LLM titles are enabled and available
 */
export function useLlmTitlesEnabled(): boolean {
  const settings = useLlmSettingsStore((state) => state.settings)
  return settings.useLlmTitles
}

/**
 * Check if LLM follow-ups are enabled
 */
export function useLlmFollowUpsEnabled(): boolean {
  const settings = useLlmSettingsStore((state) => state.settings)
  return settings.useLlmFollowUps
}
