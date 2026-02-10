import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const SkillsPanel = lazy(() =>
  import('../screens/chat/components/skills-panel').then((m) => ({
    default: m.SkillsPanel,
  })),
)

export const Route = createFileRoute('/skills')({
  component: SkillsRoute,
})

function SkillsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-primary-500 text-sm">
          Loading…
        </div>
      }
    >
      <SkillsPanel />
    </Suspense>
  )
}
