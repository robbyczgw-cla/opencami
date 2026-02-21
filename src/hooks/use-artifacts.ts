import { create } from 'zustand'

export type ArtifactType = 'html' | 'svg' | null

type ArtifactsState = {
  isEnabled: boolean
  isPanelOpen: boolean
  content: string
  type: ArtifactType
  setArtifact: (content: string, type: ArtifactType) => void
  clearArtifact: () => void
  openPanel: () => void
  closePanel: () => void
  setEnabled: (v: boolean) => void
}

function getInitialEnabled() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('feature_artifacts') === 'true'
  } catch {
    return false
  }
}

export const useArtifactsStore = create<ArtifactsState>()((set) => ({
  isEnabled: getInitialEnabled(),
  isPanelOpen: false,
  content: '',
  type: null,
  setArtifact: function setArtifact(content, type) {
    set({ content, type, isPanelOpen: true })
  },
  clearArtifact: function clearArtifact() {
    set({ content: '', type: null })
  },
  openPanel: function openPanel() {
    set({ isPanelOpen: true })
  },
  closePanel: function closePanel() {
    set({ isPanelOpen: false })
  },
  setEnabled: function setEnabled(v) {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('feature_artifacts', String(v))
      } catch {
        // Ignore storage errors.
      }
    }
    set({ isEnabled: v })
  },
}))
