import { useEffect, useRef, useState } from 'react'
import {
  fetchFollowUpSuggestions,
  getHeuristicFollowUpTexts,
} from '../lib/follow-up-generator'

type UseFollowUpSuggestionsOptions = {
  /** Minimum response length to trigger suggestions */
  minResponseLength?: number
  /** Timeout for LLM request in ms */
  timeoutMs?: number
  /** Whether to skip LLM and use heuristics only */
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
 * Hook for fetching smart follow-up suggestions.
 *
 * Uses LLM-powered generation via the gateway, with graceful fallback
 * to client-side heuristics if the LLM request fails or times out.
 */
export function useFollowUpSuggestions(
  responseText: string,
  contextSummary?: string,
  options?: UseFollowUpSuggestionsOptions,
): UseFollowUpSuggestionsResult {
  const {
    minResponseLength = 50,
    timeoutMs = 8000,
    // LLM follow-ups disabled - gateway doesn't support chat.complete yet
    heuristicsOnly = true,
  } = options ?? {}

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

    fetchFollowUpSuggestions(responseText, contextSummary, {
      signal: controller.signal,
      timeoutMs,
    })
      .then((llmSuggestions) => {
        if (controller.signal.aborted) return

        if (llmSuggestions.length > 0) {
          setSuggestions(llmSuggestions)
          setSource('llm')
        }
        // If LLM returned nothing, keep the heuristic suggestions
        setIsLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return

        // Keep heuristic suggestions on error
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [responseText, contextSummary, minResponseLength, timeoutMs, heuristicsOnly])

  return { suggestions, isLoading, error, source }
}
