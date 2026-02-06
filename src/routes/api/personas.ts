import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import personasData from '../../data/personas.json'

/**
 * API Route: /api/personas
 *
 * Returns static persona data for the Persona Picker UI.
 * Personas are bundled with OpenCami from the "personas" skill.
 */

export const Route = createFileRoute('/api/personas')({
  server: {
    handlers: {
      GET: async () => {
        return json({
          ok: true,
          personas: personasData.categories,
          available: true,
        })
      },
    },
  },
})
