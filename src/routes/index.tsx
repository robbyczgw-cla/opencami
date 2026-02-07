import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  const navigate = Route.useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const agentFilter = params.get('agent')
    // With agent filter, start on /new (not another agent's main session)
    const target = agentFilter ? 'new' : 'main'
    navigate({
      to: '/chat/$sessionKey',
      params: { sessionKey: target },
      replace: true,
    })
  }, [navigate])

  return (
    <div className="h-screen flex items-center justify-center text-primary-600">
      Loading…
    </div>
  )
}
