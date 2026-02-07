import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  const navigate = Route.useNavigate()

  useEffect(() => {
    navigate({
      to: '/chat/$sessionKey',
      params: { sessionKey: 'main' },
      replace: true,
    })
  }, [navigate])

  return (
    <div className="h-screen flex items-center justify-center text-primary-600">
      Loading…
    </div>
  )
}
