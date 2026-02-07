import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  const navigate = Route.useNavigate()

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const agentFilter = searchParams.get('agent')
    // In simple mode with agent filter, start with new chat instead of main session
    const target = agentFilter ? 'new' : 'main'
    navigate({
      to: '/chat/$sessionKey',
      params: { sessionKey: target },
      search: Object.fromEntries(searchParams),
      replace: true,
    })
  }, [navigate])

  return (
    <div className="h-screen flex items-center justify-center text-primary-600">
      Loading…
    </div>
  )
}
