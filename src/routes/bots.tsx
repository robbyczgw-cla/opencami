import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const BotsScreen = lazy(() =>
  import('../screens/bots/bots-screen').then((m) => ({
    default: m.BotsScreen,
  })),
)

export const Route = createFileRoute('/bots')({
  component: BotsRoute,
})

function BotsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-primary-500">
          Loading…
        </div>
      }
    >
      <BotsScreen />
    </Suspense>
  )
}
