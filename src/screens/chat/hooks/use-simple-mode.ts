/**
 * Simple mode — persisted in localStorage, seeded from URL params on first visit.
 *
 * First visit:  ?mode=simple&agent=tefy  → saves to localStorage
 * Every visit after: reads from localStorage (URL params no longer needed)
 * Reset: ?mode=normal  → clears simple mode
 */

const STORAGE_KEY = 'opencami-simple-mode'

type SimpleModeState = {
  isSimple: boolean
  agentFilter: string | null
}

function readState(): SimpleModeState {
  if (typeof window === 'undefined') return { isSimple: false, agentFilter: null }

  // URL params take priority (for initial setup or reset)
  const params = new URLSearchParams(window.location.search)
  const modeParam = params.get('mode')
  const agentParam = params.get('agent')

  // Reset: ?mode=normal clears everything
  if (modeParam === 'normal') {
    localStorage.removeItem(STORAGE_KEY)
    return { isSimple: false, agentFilter: null }
  }

  // If URL params present, save to localStorage
  if (modeParam === 'simple' || agentParam) {
    const state: SimpleModeState = {
      isSimple: modeParam === 'simple',
      agentFilter: agentParam || null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return state
  }

  // Otherwise read from localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}

  return { isSimple: false, agentFilter: null }
}

// Cache the result so all components get the same value per page load
let cached: SimpleModeState | null = null

export function useSimpleMode(): SimpleModeState {
  if (!cached) cached = readState()
  return cached
}
