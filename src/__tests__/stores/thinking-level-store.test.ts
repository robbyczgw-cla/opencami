import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

describe('useThinkingLevelStore', () => {
  it('should have default level of low', async () => {
    const { useThinkingLevelStore } = await import('@/hooks/use-thinking-level')
    const state = useThinkingLevelStore.getState()

    expect(state.level).toBe('low')
  })

  it('should update level', async () => {
    const { useThinkingLevelStore } = await import('@/hooks/use-thinking-level')

    act(() => {
      useThinkingLevelStore.getState().setLevel('high')
    })

    expect(useThinkingLevelStore.getState().level).toBe('high')
  })

  it('should handle all thinking levels', async () => {
    const { useThinkingLevelStore } = await import('@/hooks/use-thinking-level')

    const levels = ['off', 'low', 'medium', 'high'] as const
    for (const level of levels) {
      act(() => {
        useThinkingLevelStore.getState().setLevel(level)
      })
      expect(useThinkingLevelStore.getState().level).toBe(level)
    }
  })

  it('should persist level to localStorage', async () => {
    const { useThinkingLevelStore } = await import('@/hooks/use-thinking-level')

    act(() => {
      useThinkingLevelStore.getState().setLevel('medium')
    })

    const stored = localStorage.getItem('thinking-level')
    expect(stored).toBeDefined()
    const parsed = JSON.parse(stored!)
    expect(parsed.state.level).toBe('medium')
  })
})

describe('useThinkingLevel hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('should provide level and setLevel', async () => {
    const { useThinkingLevel, useThinkingLevelStore } = await import('@/hooks/use-thinking-level')

    // Simulated hook access via store
    const level = useThinkingLevelStore.getState().level
    const setLevel = useThinkingLevelStore.getState().setLevel

    expect(level).toBeDefined()
    expect(typeof setLevel).toBe('function')
  })
})
