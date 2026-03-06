import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const Route = createFileRoute('/api/status')({
  server: {
    handlers: {
      GET: async () => {
        const timestamp = new Date().toISOString()
        try {
          const { stdout, stderr } = await execFileAsync('openclaw', ['status'], {
            encoding: 'utf-8',
            timeout: 15000,
            maxBuffer: 1024 * 1024 * 4,
          })

          const output = [stdout, stderr].filter(Boolean).join('\n').trim()
          return json({ output: output || 'No output from openclaw status', timestamp })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return json(
            {
              output: `Failed to run \`openclaw status\`\n${message}`,
              timestamp,
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
