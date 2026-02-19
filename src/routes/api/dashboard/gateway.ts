import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getGatewayStats } from '@/server/dashboard'

export const Route = createFileRoute('/api/dashboard/gateway')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const data = await getGatewayStats()
          return json(data)
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
    },
  },
})
