import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const MemoryScreen = lazy(() =>
  import('../screens/memory/memory-screen').then((m) => ({
    default: m.MemoryScreen,
  })),
)

export const Route = createFileRoute('/memory')({
  component: MemoryRoute,
})

function MemoryRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-primary-500 text-sm">
          Loading…
        </div>
      }
    >
      <MemoryScreen />
    </Suspense>
  )
}
