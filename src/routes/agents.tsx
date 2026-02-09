import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const AgentsScreen = lazy(() =>
  import('../screens/agents/agents-screen').then((m) => ({
    default: m.AgentsScreen,
  })),
)

export const Route = createFileRoute('/agents')({
  component: AgentsRoute,
})

function AgentsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-primary-500 text-sm">
          Loading…
        </div>
      }
    >
      <AgentsScreen />
    </Suspense>
  )
}
