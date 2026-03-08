'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArtificialIntelligence02Icon,
  Loading03Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
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

type CurrentModelResponse = {
  ok: boolean
  sessionKey: string
  model: string | null
}

type ModelSelectorProps = {
  className?: string
  sessionKey?: string
  friendlyId?: string
  onModelChange?: (modelId: string | undefined) => void
}

export function ModelSelector({
  className,
  sessionKey,
  friendlyId,
  onModelChange,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onModelChangeRef = useRef(onModelChange)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    onModelChangeRef.current = onModelChange
  }, [onModelChange])

  useEffect(() => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    const loadState = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (sessionKey) params.set('sessionKey', sessionKey)
        if (friendlyId) params.set('friendlyId', friendlyId)

        const [modelsResponse, currentModelResponse] = await Promise.all([
          fetch('/api/models', { signal: controller.signal }),
          fetch(`/api/model${params.size > 0 ? `?${params.toString()}` : ''}`, {
            signal: controller.signal,
          }),
        ])

        if (!modelsResponse.ok) {
          throw new Error('Failed to fetch models')
        }
        if (!currentModelResponse.ok) {
          throw new Error('Failed to fetch current model')
        }

        const modelsData = (await modelsResponse.json()) as ModelsResponse
        const currentModelData =
          (await currentModelResponse.json()) as CurrentModelResponse

        if (!modelsData.ok || modelsData.models.length === 0) {
          throw new Error('No models available')
        }

        const serverModel = currentModelData.model?.trim() || ''
        const initialModel =
          serverModel && modelsData.models.some((model) => model.id === serverModel)
            ? serverModel
            : modelsData.defaultModel

        setModels(modelsData.models)
        setSelectedModel(initialModel)
        onModelChangeRef.current?.(initialModel || undefined)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('[model-selector] Error loading state:', err)
        setError(err instanceof Error ? err.message : 'Failed to load models')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadState()

    return () => {
      controller.abort()
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }, [friendlyId, sessionKey])

  const handleModelSelect = useCallback(
    async (modelId: string) => {
      if (modelId === selectedModel || isSwitching) return

      const previousModel = selectedModel
      setSelectedModel(modelId)
      setIsSwitching(true)
      setError(null)

      try {
        const response = await fetch('/api/model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionKey,
            friendlyId,
            model: modelId,
          }),
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || 'Failed to switch model')
        }

        const data = (await response.json()) as CurrentModelResponse
        const nextModel = data.model?.trim() || modelId
        setSelectedModel(nextModel)
        onModelChangeRef.current?.(nextModel || undefined)
      } catch (err) {
        console.error('[model-selector] Error switching model:', err)
        setSelectedModel(previousModel)
        setError(err instanceof Error ? err.message : 'Failed to switch model')
        onModelChangeRef.current?.(previousModel || undefined)
      } finally {
        setIsSwitching(false)
      }
    },
    [friendlyId, isSwitching, selectedModel, sessionKey],
  )

  const selectedModelInfo = useMemo(
    () => models.find((model) => model.id === selectedModel),
    [models, selectedModel],
  )

  const displayName = selectedModelInfo?.name || 'Select model'
  const shortDisplayName = (() => {
    if (!selectedModelInfo?.name) return displayName
    const clean = selectedModelInfo.name.replace(/\s*\([^)]*\)\s*$/, '').trim()
    const words = clean.split(/\s+/)
    if (words.length > 3) return words.slice(0, 3).join(' ')
    return clean
  })()

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-primary-500', className)}>
        <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
        <span>Loading models…</span>
      </div>
    )
  }

  if (error || models.length === 0) {
    return null
  }

  const label = isSwitching ? 'Switching…' : displayName
  const shortLabel = isSwitching ? 'Switching…' : shortDisplayName

  if (models.length === 1) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-primary-500', className)}>
        <HugeiconsIcon
          icon={isSwitching ? Loading03Icon : ArtificialIntelligence02Icon}
          size={14}
          className={isSwitching ? 'animate-spin' : undefined}
        />
        <span className="font-[450] md:hidden">{shortLabel}</span>
        <span className="hidden font-[450] md:inline">{label}</span>
      </div>
    )
  }

  return (
    <MenuRoot>
      <MenuTrigger
        className={cn(
          'inline-flex h-7 items-center gap-2 rounded-md px-2 text-xs font-[450] text-primary-600 hover:bg-primary-100 hover:text-primary-900 disabled:opacity-60',
          className,
        )}
        disabled={isSwitching}
      >
        <HugeiconsIcon
          icon={isSwitching ? Loading03Icon : ArtificialIntelligence02Icon}
          size={14}
          className={isSwitching ? 'animate-spin' : undefined}
        />
        <span className="md:hidden">{shortLabel}</span>
        <span className="hidden md:inline">{label}</span>
      </MenuTrigger>
      <MenuContent side="top" align="start">
        {models.map((model) => (
          <MenuItem
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className="min-w-[180px] justify-between"
            disabled={isSwitching}
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
