import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThinkingLevel = 'off' | 'low' | 'medium' | 'high'

type ThinkingLevelState = {
  level: ThinkingLevel
  setLevel: (level: ThinkingLevel) => void
}

export const useThinkingLevelStore = create<ThinkingLevelState>()(
  persist(
    (set) => ({
      level: 'low',
      setLevel: (level) => set({ level }),
    }),
    { name: 'thinking-level' },
  ),
)

export function useThinkingLevel() {
  const level = useThinkingLevelStore((state) => state.level)
  const setLevel = useThinkingLevelStore((state) => state.setLevel)

  return { level, setLevel }
}
