import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('useChatSettingsStore', () => {
  it('should have default settings', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')
    const state = useChatSettingsStore.getState()

    expect(state.settings.showToolMessages).toBe(true)
    expect(state.settings.showReasoningBlocks).toBe(true)
    expect(state.settings.showSearchSources).toBe(true)
    expect(state.settings.inlineFilePreview).toBe(false)
    expect(state.settings.theme).toBe('system')
    expect(state.settings.fontFamily).toBe('system')
    expect(state.settings.density).toBe('comfortable')
    expect(state.settings.accentColor).toBe('green')
    expect(state.settings.chatWidth).toBe('wide')
    expect(state.settings.sidebarWidth).toBe('normal')
    expect(state.settings.bubbleStyle).toBe('default')
  })

  it('should update settings', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')

    act(() => {
      useChatSettingsStore.getState().updateSettings({
        theme: 'dark',
        showToolMessages: false,
        accentColor: 'blue',
      })
    })

    const state = useChatSettingsStore.getState()
    expect(state.settings.theme).toBe('dark')
    expect(state.settings.showToolMessages).toBe(false)
    expect(state.settings.accentColor).toBe('blue')
    // Other settings unchanged
    expect(state.settings.showReasoningBlocks).toBe(true)
  })

  it('should persist settings to localStorage', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')

    act(() => {
      useChatSettingsStore.getState().updateSettings({
        theme: 'chameleon',
        density: 'spacious',
      })
    })

    const stored = localStorage.getItem('chat-settings')
    expect(stored).toBeDefined()
    const parsed = JSON.parse(stored!)
    expect(parsed.state.settings.theme).toBe('chameleon')
    expect(parsed.state.settings.density).toBe('spacious')
  })

  it('should handle all theme modes', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')

    const themes = ['system', 'light', 'dark', 'chameleon', 'frost-light', 'frost-dark'] as const
    for (const theme of themes) {
      act(() => {
        useChatSettingsStore.getState().updateSettings({ theme })
      })
      expect(useChatSettingsStore.getState().settings.theme).toBe(theme)
    }
  })

  it('should handle all density modes', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')

    const densities = ['compact', 'comfortable', 'spacious'] as const
    for (const density of densities) {
      act(() => {
        useChatSettingsStore.getState().updateSettings({ density })
      })
      expect(useChatSettingsStore.getState().settings.density).toBe(density)
    }
  })

  it('should handle all accent colors', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')

    const colors = ['green', 'blue', 'purple', 'orange', 'pink', 'red', 'cyan', 'yellow'] as const
    for (const accentColor of colors) {
      act(() => {
        useChatSettingsStore.getState().updateSettings({ accentColor })
      })
      expect(useChatSettingsStore.getState().settings.accentColor).toBe(accentColor)
    }
  })

  it('should handle all chat width modes', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')

    const widths = ['narrow', 'medium', 'wide', 'full'] as const
    for (const chatWidth of widths) {
      act(() => {
        useChatSettingsStore.getState().updateSettings({ chatWidth })
      })
      expect(useChatSettingsStore.getState().settings.chatWidth).toBe(chatWidth)
    }
  })

  it('should handle all sidebar width modes', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')

    const widths = ['compact', 'normal', 'wide', 'xl'] as const
    for (const sidebarWidth of widths) {
      act(() => {
        useChatSettingsStore.getState().updateSettings({ sidebarWidth })
      })
      expect(useChatSettingsStore.getState().settings.sidebarWidth).toBe(sidebarWidth)
    }
  })

  it('should handle all bubble style modes', async () => {
    const { useChatSettingsStore } = await import('@/hooks/use-chat-settings')

    const styles = ['default', 'bubbles', 'minimal'] as const
    for (const bubbleStyle of styles) {
      act(() => {
        useChatSettingsStore.getState().updateSettings({ bubbleStyle })
      })
      expect(useChatSettingsStore.getState().settings.bubbleStyle).toBe(bubbleStyle)
    }
  })
})

describe('useChatSettings hook', () => {
  it('should provide settings and updateSettings', async () => {
    const { useChatSettings, useChatSettingsStore } = await import('@/hooks/use-chat-settings')

    // Get hook result (simulated)
    const settings = useChatSettingsStore.getState().settings
    const updateSettings = useChatSettingsStore.getState().updateSettings

    expect(settings).toBeDefined()
    expect(typeof updateSettings).toBe('function')
  })
})
