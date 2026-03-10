import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/stream')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/api/stream"!</div>
}
