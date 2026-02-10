'use client'

import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArtificialIntelligence02Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { MenuRoot, MenuTrigger, MenuContent, MenuItem } from '@/components/ui/menu'
import { cn } from '@/lib/utils'

type ModelInfo = {
  id: string
  name: string
  provider?: string
}

type ModelsResponse = {
  ok: boolean
  models: ModelInfo[]
  defaultModel: string
}

const STORAGE_KEY = 'opencami-selected-model'

function getStoredModel(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setStoredModel(modelId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, modelId)
  } catch {
    // Ignore storage errors
  }
}

type ModelSelectorProps = {
  className?: string
  onModelChange?: (modelId: string) => void
}

export function ModelSelector({ className, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchModels() {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/models', { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Failed to fetch models')
        }

        const data = (await response.json()) as ModelsResponse

        if (!mounted) return

        if (data.ok && data.models.length > 0) {
          setModels(data.models)

          // Set initial selection: stored preference > default from server
          const storedModel = getStoredModel()
          const initialModel =
            storedModel && data.models.some((m) => m.id === storedModel)
              ? storedModel
              : data.defaultModel

          setSelectedModel(initialModel)
          onModelChange?.(initialModel)
        } else {
          throw new Error('No models available')
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        if (!mounted) return
        console.error('[model-selector] Error fetching models:', err)
        setError(err instanceof Error ? err.message : 'Failed to load models')
        // Set a fallback
        setModels([{ id: 'default', name: 'Default Model' }])
        setSelectedModel('default')
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchModels()

    return () => {
      mounted = false
      abortControllerRef.current?.abort()
    }
  }, [onModelChange])

  function handleModelSelect(modelId: string) {
    setSelectedModel(modelId)
    setStoredModel(modelId)
    onModelChange?.(modelId)
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-primary-500', className)}>
        <HugeiconsIcon icon={ArtificialIntelligence02Icon} size={14} />
        <span>Loading...</span>
      </div>
    )
  }

  if (error || models.length === 0) {
    return null // Hide on error
  }

  const selectedModelInfo = models.find((m) => m.id === selectedModel)
  const displayName = selectedModelInfo?.name || 'Select Model'
  // Shorter display for mobile: extract a compact alias from model name
  const shortDisplayName = (() => {
    if (!selectedModelInfo?.name) return displayName
    const name = selectedModelInfo.name
    // Remove parenthesized suffixes like "(opus46)" and trim
    const clean = name.replace(/\s*\([^)]*\)\s*$/, '').trim()
    // If still long, take first two words
    const words = clean.split(/\s+/)
    if (words.length > 3) return words.slice(0, 3).join(' ')
    return clean
  })()

  // Don't show selector if there's only one model
  if (models.length === 1) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-primary-500', className)}>
        <HugeiconsIcon icon={ArtificialIntelligence02Icon} size={14} />
        <span className="font-[450] md:hidden">{shortDisplayName}</span>
        <span className="font-[450] hidden md:inline">{displayName}</span>
      </div>
    )
  }

  return (
    <MenuRoot>
      <MenuTrigger
        className={cn(
          'inline-flex h-7 items-center gap-2 rounded-md px-2 text-xs font-[450] text-primary-600 hover:text-primary-900 hover:bg-primary-100',
          className,
        )}
      >
        <HugeiconsIcon icon={ArtificialIntelligence02Icon} size={14} />
        <span className="md:hidden">{shortDisplayName}</span>
        <span className="hidden md:inline">{displayName}</span>
      </MenuTrigger>
      <MenuContent side="top" align="start">
        {models.map((model) => (
          <MenuItem
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className="justify-between min-w-[180px]"
          >
            <span>{model.name}</span>
            {selectedModel === model.id && (
              <HugeiconsIcon
                icon={Tick02Icon}
                size={14}
                className="text-primary-600"
              />
            )}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  )
}
