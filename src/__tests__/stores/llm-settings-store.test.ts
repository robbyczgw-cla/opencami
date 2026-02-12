import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'

// Reset the store before each test by clearing localStorage
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('useLlmSettingsStore', () => {
  it('should have default settings', async () => {
    const { useLlmSettingsStore } = await import('@/hooks/use-llm-settings')
    const state = useLlmSettingsStore.getState()

    expect(state.settings.useLlmTitles).toBe(true)
    expect(state.settings.useLlmFollowUps).toBe(true)
    expect(state.settings.llmProvider).toBe('openai')
    expect(state.settings.llmApiKey).toBe('')
    expect(state.settings.llmBaseUrl).toBe('')
    expect(state.settings.llmModel).toBe('')
  })

  it('should update settings', async () => {
    const { useLlmSettingsStore } = await import('@/hooks/use-llm-settings')

    act(() => {
      useLlmSettingsStore.getState().updateSettings({
        useLlmTitles: false,
        llmProvider: 'openrouter',
      })
    })

    const state = useLlmSettingsStore.getState()
    expect(state.settings.useLlmTitles).toBe(false)
    expect(state.settings.llmProvider).toBe('openrouter')
    // Other settings should remain unchanged
    expect(state.settings.useLlmFollowUps).toBe(true)
  })

  it('should clear API key', async () => {
    const { useLlmSettingsStore } = await import('@/hooks/use-llm-settings')

    act(() => {
      useLlmSettingsStore.getState().updateSettings({
        llmApiKey: 'sk-test-key-12345',
      })
    })

    expect(useLlmSettingsStore.getState().settings.llmApiKey).toBe('sk-test-key-12345')

    act(() => {
      useLlmSettingsStore.getState().clearApiKey()
    })

    expect(useLlmSettingsStore.getState().settings.llmApiKey).toBe('')
  })

  it('should persist settings to localStorage', async () => {
    const { useLlmSettingsStore } = await import('@/hooks/use-llm-settings')

    act(() => {
      useLlmSettingsStore.getState().updateSettings({
        llmProvider: 'ollama',
        llmModel: 'llama3',
      })
    })

    // Check localStorage
    const stored = localStorage.getItem('llm-settings')
    expect(stored).toBeDefined()
    const parsed = JSON.parse(stored!)
    expect(parsed.state.settings.llmProvider).toBe('ollama')
    expect(parsed.state.settings.llmModel).toBe('llama3')
  })
})

describe('getLlmProviderDefaults', () => {
  it('should return defaults for OpenAI', async () => {
    const { getLlmProviderDefaults } = await import('@/hooks/use-llm-settings')
    const defaults = getLlmProviderDefaults('openai')

    expect(defaults.baseUrl).toBe('https://api.openai.com/v1')
    expect(defaults.model).toBe('gpt-4.1-nano')
  })

  it('should return defaults for OpenRouter', async () => {
    const { getLlmProviderDefaults } = await import('@/hooks/use-llm-settings')
    const defaults = getLlmProviderDefaults('openrouter')

    expect(defaults.baseUrl).toBe('https://openrouter.ai/api/v1')
    expect(defaults.model).toBe('openai/gpt-oss-120b')
  })

  it('should return defaults for Ollama', async () => {
    const { getLlmProviderDefaults } = await import('@/hooks/use-llm-settings')
    const defaults = getLlmProviderDefaults('ollama')

    expect(defaults.baseUrl).toBe('http://localhost:11434/v1')
    expect(defaults.model).toBe('llama3.2')
  })

  it('should return empty defaults for custom', async () => {
    const { getLlmProviderDefaults } = await import('@/hooks/use-llm-settings')
    const defaults = getLlmProviderDefaults('custom')

    expect(defaults.baseUrl).toBe('')
    expect(defaults.model).toBe('')
  })
})

describe('getLlmHeaders', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('should return empty headers when no API key', async () => {
    const { getLlmHeaders, useLlmSettingsStore } = await import('@/hooks/use-llm-settings')

    // Ensure default state with no API key
    act(() => {
      useLlmSettingsStore.getState().updateSettings({
        llmApiKey: '',
        llmBaseUrl: '',
        llmModel: '',
      })
    })

    const headers = getLlmHeaders()
    expect(headers['X-OpenAI-API-Key']).toBeUndefined()
  })

  it('should include API key header when set', async () => {
    const { getLlmHeaders, useLlmSettingsStore } = await import('@/hooks/use-llm-settings')

    act(() => {
      useLlmSettingsStore.getState().updateSettings({
        llmApiKey: 'sk-test-key',
      })
    })

    const headers = getLlmHeaders()
    expect(headers['X-OpenAI-API-Key']).toBe('sk-test-key')
  })

  it('should include custom base URL and model', async () => {
    const { getLlmHeaders, useLlmSettingsStore } = await import('@/hooks/use-llm-settings')

    act(() => {
      useLlmSettingsStore.getState().updateSettings({
        llmApiKey: 'sk-test',
        llmBaseUrl: 'https://custom.api.com/v1',
        llmModel: 'custom-model',
      })
    })

    const headers = getLlmHeaders()
    expect(headers['X-LLM-Base-URL']).toBe('https://custom.api.com/v1')
    expect(headers['X-LLM-Model']).toBe('custom-model')
  })
})
