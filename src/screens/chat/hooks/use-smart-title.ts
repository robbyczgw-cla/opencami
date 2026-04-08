import { useCallback, useRef, useState } from 'react'

type GenerateTitleResult = {
  title: string
  source: 'openclaw' | 'heuristic'
  error?: string
}

type UseSmartTitleResult = {
  generateTitle: (message: string) => Promise<GenerateTitleResult>
  isGenerating: boolean
  lastTitle: string | null
  lastSource: 'openclaw' | 'heuristic' | null
}

export function useSmartTitle(): UseSmartTitleResult {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastTitle, setLastTitle] = useState<string | null>(null)
  const [lastSource, setLastSource] = useState<'openclaw' | 'heuristic' | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateTitle = useCallback(async (message: string): Promise<GenerateTitleResult> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsGenerating(true)

    try {
      const res = await fetch('/api/llm-features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        source?: 'openclaw' | 'heuristic'
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
  }, [])

  return {
    generateTitle,
    isGenerating,
    lastTitle,
    lastSource,
  }
}

function generateHeuristicTitle(message: string): string {
  let text = message.replace(/```[\s\S]*?```/g, ' ')
  text = text.replace(/`[^`]+`/g, ' ')
  text = text.replace(/https?:\/\/[^\s]+/g, ' ')
  text = text.replace(/[^\w\s.,!?'-]/g, ' ')
  text = text.replace(/\s+/g, ' ').trim()

  const words = text.split(/\s+/).filter((word) => {
    if (word.length <= 2) {
      const upper = word.toUpperCase()
      return ['AI', 'ML', 'UI', 'UX', 'API', 'CSS', 'JS'].includes(upper)
    }
    return true
  })

  const titleWords = words.slice(0, 6)
  let title = titleWords.join(' ')
  title = title.replace(/[.,!?]+$/, '')

  if (title.length > 60) {
    title = title.slice(0, 57) + '...'
  }

  return title || message.slice(0, 50)
}

export function useLlmTitlesEnabled(): boolean {
  return true
}
