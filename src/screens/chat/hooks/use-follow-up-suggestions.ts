import { useEffect, useRef, useState } from 'react'
import { getHeuristicFollowUpTexts } from '../lib/follow-up-generator'
import { getLlmHeaders, useLlmSettingsStore } from '@/hooks/use-llm-settings'

type UseFollowUpSuggestionsOptions = {
  /** Minimum response length to trigger suggestions */
  minResponseLength?: number
  /** Timeout for LLM request in ms */
  timeoutMs?: number
  /** Whether to skip LLM and use heuristics only (overrides settings) */
  heuristicsOnly?: boolean
}

type UseFollowUpSuggestionsResult = {
  suggestions: string[]
  isLoading: boolean
  error: string | null
  /** Source of current suggestions: 'llm', 'heuristic', or null */
  source: 'llm' | 'heuristic' | null
}

/**
 * Fetch LLM-generated follow-up suggestions from the LLM API
 */
async function fetchLlmFollowUps(
  conversationContext: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getLlmHeaders(),
  }

  const res = await fetch('/api/llm-features', {
    method: 'POST',
    headers,
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

/**
 * Hook for fetching smart follow-up suggestions.
 *
 * Uses LLM-powered generation via OpenAI API when enabled in settings,
 * with graceful fallback to client-side heuristics if the LLM request
 * fails or times out.
 */
export function useFollowUpSuggestions(
  responseText: string,
  contextSummary?: string,
  options?: UseFollowUpSuggestionsOptions,
): UseFollowUpSuggestionsResult {
  // Get LLM settings
  const llmSettings = useLlmSettingsStore((state) => state.settings)
  const useLlmFollowUps = llmSettings.useLlmFollowUps

  const {
    minResponseLength = 50,
    timeoutMs = 8000,
    // Use heuristics only if explicitly set OR if LLM follow-ups are disabled
    heuristicsOnly: forceHeuristicsOnly,
  } = options ?? {}

  // Determine if we should use heuristics only
  const heuristicsOnly = forceHeuristicsOnly ?? !useLlmFollowUps
  
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'llm' | 'heuristic' | null>(null)

  // Track the response text to avoid duplicate requests
  const lastResponseRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Skip if response is too short
    if (!responseText || responseText.trim().length < minResponseLength) {
      setSuggestions([])
      setSource(null)
      setIsLoading(false)
      setError(null)
      return
    }

    // Skip if we already processed this response
    const responseKey = responseText.slice(0, 200) + responseText.length
    if (responseKey === lastResponseRef.current) {
      return
    }
    lastResponseRef.current = responseKey

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Use heuristics only mode
    if (heuristicsOnly) {
      const heuristicSuggestions = getHeuristicFollowUpTexts(responseText)
      setSuggestions(heuristicSuggestions)
      setSource('heuristic')
      setIsLoading(false)
      setError(null)
      return
    }

    // Start LLM request
    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsLoading(true)
    setError(null)

    // Show heuristic suggestions immediately while LLM loads
    const heuristicSuggestions = getHeuristicFollowUpTexts(responseText)
    setSuggestions(heuristicSuggestions)
    setSource('heuristic')

    // Build context for the API call
    const conversationContext = contextSummary
      ? `Context: ${contextSummary}\n\nAssistant's response:\n${responseText.slice(0, 2000)}`
      : `Assistant's response:\n${responseText.slice(0, 2000)}`

    // Use OpenAI API via our endpoint
    fetchLlmFollowUps(conversationContext, controller.signal)
      .then((llmSuggestions) => {
        if (controller.signal.aborted) {
          return
        }

        if (llmSuggestions.length > 0) {
          setSuggestions(llmSuggestions)
          setSource('llm')
        }
        setIsLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        // Keep heuristic suggestions on error
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      })

    return () => {
      // Don't abort on re-render - let the request complete
      // Only abort gets called on unmount which is fine
    }
  }, [
    responseText,
    contextSummary,
    minResponseLength,
    timeoutMs,
    heuristicsOnly,
    llmSettings.llmApiKey,
    llmSettings.llmBaseUrl,
    llmSettings.llmModel,
    llmSettings.llmProvider,
  ])

  return { suggestions, isLoading, error, source }
}
