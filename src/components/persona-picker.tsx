'use client'

import { useEffect, useState, useCallback } from 'react'
import { MenuRoot, MenuTrigger, MenuContent, MenuItem } from '@/components/ui/menu'
import { cn } from '@/lib/utils'

type Persona = {
  id: string
  name: string
  emoji: string
  description: string
}

type PersonaCategories = Record<string, Persona[]>

type PersonasResponse = {
  ok: boolean
  personas: PersonaCategories
  available: boolean
}

const ACTIVE_PERSONA_KEY = 'opencami-active-persona'

function getStoredPersona(): Persona | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(ACTIVE_PERSONA_KEY)
    return stored ? (JSON.parse(stored) as Persona) : null
  } catch {
    return null
  }
}

function setStoredPersona(persona: Persona | null): void {
  if (typeof window === 'undefined') return
  try {
    if (persona) {
      localStorage.setItem(ACTIVE_PERSONA_KEY, JSON.stringify(persona))
    } else {
      localStorage.removeItem(ACTIVE_PERSONA_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  creative: 'Creative',
  curator: 'Curator',
  learning: 'Learning',
  lifestyle: 'Lifestyle',
  professional: 'Professional',
  philosophy: 'Philosophy',
}

type PersonaPickerProps = {
  className?: string
  onSelect: (command: string) => void
}

export function PersonaPicker({ className, onSelect }: PersonaPickerProps) {
  const [categories, setCategories] = useState<PersonaCategories>({})
  const [activePersona, setActivePersona] = useState<Persona | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let mounted = true

    async function fetchPersonas() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/personas')
        if (!response.ok) {
          setAvailable(false)
          return
        }

        const data = (await response.json()) as PersonasResponse

        if (!mounted) return

        if (data.ok && data.available) {
          setCategories(data.personas)
          setAvailable(true)
          setActivePersona(getStoredPersona())
        } else {
          setAvailable(false)
        }
      } catch {
        if (!mounted) return
        setAvailable(false)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchPersonas()

    return () => {
      mounted = false
    }
  }, [])

  const handleSelectPersona = useCallback(
    (persona: Persona) => {
      setActivePersona(persona)
      setStoredPersona(persona)
      onSelect(`/persona ${persona.id}`)
    },
    [onSelect],
  )

  const handleExitPersona = useCallback(() => {
    setActivePersona(null)
    setStoredPersona(null)
    onSelect('/persona exit')
  }, [onSelect])

  if (isLoading || !available) {
    return null
  }

  const categoryEntries = Object.entries(categories)
  if (categoryEntries.length === 0) {
    return null
  }

  return (
    <MenuRoot>
      <MenuTrigger
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-[450] text-primary-600 hover:text-primary-900 hover:bg-primary-100',
          className,
        )}
      >
        <span className="text-sm" aria-hidden="true">🎭</span>
        {activePersona ? (
          <span className="flex items-center gap-1">
            <span>{activePersona.emoji}</span>
            <span>{activePersona.name}</span>
          </span>
        ) : (
          <span>Persona</span>
        )}
      </MenuTrigger>
      <MenuContent
        side="top"
        align="start"
        className="w-[300px] max-h-[360px] overflow-y-auto"
      >
        {/* Exit Persona option */}
        {activePersona && (
          <>
            <MenuItem
              onClick={handleExitPersona}
              className="text-red-600 hover:bg-red-50"
            >
              <span className="text-sm">✕</span>
              <span>Exit Persona</span>
              <span className="ml-auto text-[10px] text-primary-400">
                {activePersona.emoji} {activePersona.name}
              </span>
            </MenuItem>
            <div className="my-1 h-px bg-primary-200" />
          </>
        )}

        {/* Persona categories */}
        {categoryEntries.map(([category, personas]) => (
          <div key={category}>
            <div className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-primary-400">
              {CATEGORY_LABELS[category] ?? category}
            </div>
            {personas.map((persona) => (
              <MenuItem
                key={persona.id}
                onClick={() => handleSelectPersona(persona)}
                className="justify-between"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-sm flex-shrink-0">{persona.emoji}</span>
                  <span className="truncate">{persona.name}</span>
                </span>
                <span className="text-[11px] text-primary-400 truncate ml-2 max-w-[140px]">
                  {persona.description}
                </span>
              </MenuItem>
            ))}
          </div>
        ))}
      </MenuContent>
    </MenuRoot>
  )
}
