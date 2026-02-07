import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  // Read URL params BEFORE any React routing strips them
  const search = window.location.search
  const params = new URLSearchParams(search)
  const agentFilter = params.get('agent')
  const mode = params.get('mode')

  // Save simple mode to localStorage on first visit
  if (mode === 'simple' || agentFilter) {
    localStorage.setItem('opencami-simple-mode', JSON.stringify({
      isSimple: mode === 'simple',
      agentFilter: agentFilter || null,
    }))
  } else if (mode === 'normal') {
    localStorage.removeItem('opencami-simple-mode')
  }

  // Raw redirect — bypasses TanStack Router completely
  const target = agentFilter ? 'new' : 'main'
  window.location.replace(`/chat/${target}`)

  return (
    <div className="h-screen flex items-center justify-center text-primary-600">
      Loading…
    </div>
  )
}
