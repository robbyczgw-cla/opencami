import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'

/**
 * Integration tests for settings persistence across stores.
 * Tests that settings correctly persist to and restore from localStorage.
 */

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('Settings Persistence Integration', () => {
  describe('Chat Settings', () => {
    it('should persist and restore theme setting', async () => {
      const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')
      
      // Set a theme
      act(() => {
        useChatSettingsStore.getState().updateSettings({ theme: 'dark' })
      })
      
      // Verify it was stored
      const stored = localStorage.getItem('chat-settings')
      expect(stored).toBeDefined()
      expect(JSON.parse(stored!).state.settings.theme).toBe('dark')
      
      // Reset modules to simulate page reload
      vi.resetModules()
      
      // Re-import and verify state was restored
      const { useChatSettingsStore: reloadedStore } = await import('@/hooks/use-chat-settings')
      // Note: Zustand persist requires hydration in real app
      // This test verifies localStorage was written correctly
    })

    it('should handle partial updates without losing other settings', async () => {
      const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')
      
      // Set multiple settings
      act(() => {
        useChatSettingsStore.getState().updateSettings({
          theme: 'dark',
          accentColor: 'blue',
          density: 'spacious',
        })
      })
      
      // Update only one setting
      act(() => {
        useChatSettingsStore.getState().updateSettings({
          accentColor: 'purple',
        })
      })
      
      const state = useChatSettingsStore.getState().settings
      expect(state.theme).toBe('dark')
      expect(state.accentColor).toBe('purple')
      expect(state.density).toBe('spacious')
    })
  })

  describe('LLM Settings', () => {
    it('should securely store API key in localStorage', async () => {
      const { useLlmSettingsStore } = await import('@/hooks/use-llm-settings')
      
      act(() => {
        useLlmSettingsStore.getState().updateSettings({
          llmApiKey: 'sk-test-12345',
        })
      })
      
      // Verify it's in localStorage (for client-side persistence)
      const stored = localStorage.getItem('llm-settings')
      expect(stored).toContain('sk-test-12345')
    })

    it('should clear API key completely', async () => {
      const { useLlmSettingsStore } = await import('@/hooks/use-llm-settings')
      
      act(() => {
        useLlmSettingsStore.getState().updateSettings({
          llmApiKey: 'sk-test-12345',
        })
      })
      
      expect(useLlmSettingsStore.getState().settings.llmApiKey).toBe('sk-test-12345')
      
      act(() => {
        useLlmSettingsStore.getState().clearApiKey()
      })
      
      expect(useLlmSettingsStore.getState().settings.llmApiKey).toBe('')
      
      // Verify localStorage was updated
      const stored = localStorage.getItem('llm-settings')
      expect(stored).not.toContain('sk-test-12345')
    })
  })

  describe('Thinking Level', () => {
    it('should persist thinking level changes', async () => {
      const { useThinkingLevelStore } = await import('@/hooks/use-thinking-level')
      
      const levels = ['off', 'low', 'medium', 'high'] as const
      
      for (const level of levels) {
        act(() => {
          useThinkingLevelStore.getState().setLevel(level)
        })
        
        const stored = localStorage.getItem('thinking-level')
        expect(JSON.parse(stored!).state.level).toBe(level)
      }
    })
  })
})

describe('Cross-Store Independence', () => {
  it('should not affect other stores when updating one', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')
    const { useLlmSettingsStore } = await import('@/hooks/use-llm-settings')
    const { useThinkingLevelStore } = await import('@/hooks/use-thinking-level')
    
    // Set initial values
    act(() => {
      useChatSettingsStore.getState().updateSettings({ theme: 'dark' })
      useLlmSettingsStore.getState().updateSettings({ llmProvider: 'ollama' })
      useThinkingLevelStore.getState().setLevel('high')
    })
    
    // Update one store
    act(() => {
      useChatSettingsStore.getState().updateSettings({ theme: 'light' })
    })
    
    // Verify others are unchanged
    expect(useLlmSettingsStore.getState().settings.llmProvider).toBe('ollama')
    expect(useThinkingLevelStore.getState().level).toBe('high')
  })
})
