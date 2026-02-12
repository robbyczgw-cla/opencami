import { useCallback, useRef, useState } from 'react'
import { getLlmHeaders, useLlmSettingsStore } from '@/hooks/use-llm-settings'

type GenerateTitleResult = {
  title: string
  source: 'llm' | 'heuristic'
  error?: string
}

type UseSmartTitleResult = {
  generateTitle: (message: string) => Promise<GenerateTitleResult>
  isGenerating: boolean
  lastTitle: string | null
  lastSource: 'llm' | 'heuristic' | null
}

/**
 * Hook for generating smart session titles
 * 
 * Uses LLM-powered title generation via OpenAI API when enabled,
 * with automatic fallback to heuristic generation.
 */
export function useSmartTitle(): UseSmartTitleResult {
  const llmSettings = useLlmSettingsStore((state) => state.settings)
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastTitle, setLastTitle] = useState<string | null>(null)
  const [lastSource, setLastSource] = useState<'llm' | 'heuristic' | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateTitle = useCallback(
    async (message: string): Promise<GenerateTitleResult> => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      setIsGenerating(true)

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...getLlmHeaders(),
        }

        const res = await fetch('/api/llm-features', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'title',
            message,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`)
        }

        const data = (await res.json()) as {
          ok: boolean
          title?: string
          source?: 'llm' | 'heuristic'
          error?: string
        }

        if (controller.signal.aborted) {
          throw new Error('Aborted')
        }

        const rawTitle = data.title || message.slice(0, 50)
        const title = rawTitle.length > 64 ? rawTitle.slice(0, 61) + '...' : rawTitle
        const source = data.source || 'heuristic'

        setLastTitle(title)
        setLastSource(source)

        return {
          title,
          source,
          error: data.error,
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw err
        }

        // Fallback to simple heuristic
        const fallbackTitle = generateHeuristicTitle(message)
        setLastTitle(fallbackTitle)
        setLastSource('heuristic')

        return {
          title: fallbackTitle,
          source: 'heuristic',
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      } finally {
        setIsGenerating(false)
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
      }
    },
    [
      llmSettings.llmApiKey,
      llmSettings.llmBaseUrl,
      llmSettings.llmModel,
      llmSettings.llmProvider,
    ],
  )

  return {
    generateTitle,
    isGenerating,
    lastTitle,
    lastSource,
  }
}

/**
 * Generate a simple heuristic title from message text
 */
function generateHeuristicTitle(message: string): string {
  // Remove code blocks
  let text = message.replace(/```[\s\S]*?```/g, ' ')
  // Remove inline code
  text = text.replace(/`[^`]+`/g, ' ')
  // Remove URLs
  text = text.replace(/https?:\/\/[^\s]+/g, ' ')
  // Remove special characters
  text = text.replace(/[^\w\s.,!?'-]/g, ' ')
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim()

  // Split into words
  const words = text.split(/\s+/).filter((word) => {
    if (word.length <= 2) {
      const upper = word.toUpperCase()
      return ['AI', 'ML', 'UI', 'UX', 'API', 'CSS', 'JS'].includes(upper)
    }
    return true
  })

  // Take first 5-6 words
  const titleWords = words.slice(0, 6)
  let title = titleWords.join(' ')

  // Clean up
  title = title.replace(/[.,!?]+$/, '')

  if (title.length > 60) {
    title = title.slice(0, 57) + '...'
  }

  return title || message.slice(0, 50)
}

/**
 * Check if LLM titles are enabled
 */
export function useLlmTitlesEnabled(): boolean {
  return useLlmSettingsStore((state) => state.settings.useLlmTitles)
}
