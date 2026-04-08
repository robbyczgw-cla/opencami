import { useEffect, useRef, useState } from 'react'
import { getHeuristicFollowUpTexts } from '../lib/follow-up-generator'

type UseFollowUpSuggestionsOptions = {
  minResponseLength?: number
  timeoutMs?: number
  heuristicsOnly?: boolean
}

type UseFollowUpSuggestionsResult = {
  suggestions: string[]
  isLoading: boolean
  error: string | null
  source: 'openclaw' | 'heuristic' | null
}

async function fetchFollowUpsViaOpenclaw(
  conversationContext: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const res = await fetch('/api/llm-features', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'followups',
      conversationContext,
    }),
    signal,
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  const data = (await res.json()) as {
    ok: boolean
    suggestions?: string[]
    source?: string
    error?: string
  }

  if (data.ok && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
    return data.suggestions
  }

  return []
}

export function useFollowUpSuggestions(
  responseText: string,
  contextSummary?: string,
  options?: UseFollowUpSuggestionsOptions,
): UseFollowUpSuggestionsResult {
  const { minResponseLength = 50, heuristicsOnly = false } = options ?? {}

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'openclaw' | 'heuristic' | null>(null)

  const lastResponseRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!responseText || responseText.trim().length < minResponseLength) {
      setSuggestions([])
      setSource(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const responseKey = responseText.slice(0, 200) + responseText.length
    if (responseKey === lastResponseRef.current) {
      return
    }
    lastResponseRef.current = responseKey

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (heuristicsOnly) {
      const heuristicSuggestions = getHeuristicFollowUpTexts(responseText)
      setSuggestions(heuristicSuggestions)
      setSource('heuristic')
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsLoading(true)
    setError(null)

    const heuristicSuggestions = getHeuristicFollowUpTexts(responseText)
    setSuggestions(heuristicSuggestions)
    setSource('heuristic')

    const conversationContext = contextSummary
      ? `Context: ${contextSummary}\n\nAssistant's response:\n${responseText.slice(0, 2000)}`
      : `Assistant's response:\n${responseText.slice(0, 2000)}`

    fetchFollowUpsViaOpenclaw(conversationContext, controller.signal)
      .then((openclawSuggestions) => {
        if (controller.signal.aborted) return

        if (openclawSuggestions.length > 0) {
          setSuggestions(openclawSuggestions)
          setSource('openclaw')
        }
        setIsLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      })
  }, [responseText, contextSummary, minResponseLength, heuristicsOnly])

  return { suggestions, isLoading, error, source }
}
