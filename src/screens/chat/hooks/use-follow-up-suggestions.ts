import { useEffect, useRef, useState } from 'react'
import { useChatSettings } from '@/hooks/use-chat-settings'

type UseFollowUpSuggestionsOptions = {
  minResponseLength?: number
  timeoutMs?: number
  heuristicsOnly?: boolean
  enabled?: boolean
}

type UseFollowUpSuggestionsResult = {
  suggestions: string[]
  isLoading: boolean
  error: string | null
  source: 'openclaw' | 'heuristic' | null
}

async function fetchFollowUpsViaOpenclaw(
  conversationContext: string,
  model?: string,
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
      model,
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
  conversationContext?: string,
  options?: UseFollowUpSuggestionsOptions,
): UseFollowUpSuggestionsResult {
  const { settings } = useChatSettings()
  const { minResponseLength = 50, heuristicsOnly = false, enabled = true } =
    options ?? {}

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'openclaw' | 'heuristic' | null>(null)

  const lastResponseRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      setSuggestions([])
      setSource(null)
      setIsLoading(false)
      setError(null)
      return
    }

    if (!responseText || responseText.trim().length < minResponseLength) {
      setSuggestions([])
      setSource(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const responseKey = `${settings.llmFeaturesModel}:${responseText.slice(0, 200)}${responseText.length}`
    if (responseKey === lastResponseRef.current) {
      return
    }
    lastResponseRef.current = responseKey

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (heuristicsOnly) {
      setSuggestions([])
      setSource(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsLoading(true)
    setError(null)
    setSuggestions([])
    setSource(null)

    const requestContext = conversationContext?.trim().length
      ? conversationContext.trim()
      : `Assistant's response:\n${responseText.slice(0, 2000)}`

    fetchFollowUpsViaOpenclaw(
      requestContext,
      settings.llmFeaturesModel
        ? `openclaw/${settings.llmFeaturesModel}`
        : undefined,
      controller.signal,
    )
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
        setSuggestions([])
        setSource(null)
        setError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      })
  }, [
    responseText,
    conversationContext,
    enabled,
    minResponseLength,
    heuristicsOnly,
    settings.llmFeaturesModel,
  ])

  return { suggestions, isLoading, error, source }
}
