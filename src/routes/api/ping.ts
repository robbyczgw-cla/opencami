import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/ping')({
  server: {
    handlers: {
      GET: async () => {
        return json({ ok: true })
      },
    },
  },
})
