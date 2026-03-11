import { PassThrough, Readable } from 'node:stream'
import { createFileRoute } from '@tanstack/react-router'
import { acquireGatewayClient } from '../../server/gateway'

type StreamEventPayload = {
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: number
}

export const Route = createFileRoute('/api/stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const sessionKey = url.searchParams.get('sessionKey')?.trim() || ''
        const friendlyId = url.searchParams.get('friendlyId')?.trim() || ''
        const key = sessionKey || friendlyId

        if (!key) {
          return new Response(
            JSON.stringify({ ok: false, error: 'sessionKey or friendlyId required' }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          )
        }

        const pass = new PassThrough()
        const encoder = new TextEncoder()

        let closed = false
        let heartbeat: ReturnType<typeof setInterval> | null = null
        let releaseClient: (() => void) | null = null

        function writeChunk(chunk: string) {
          if (closed) return
          try {
            pass.write(encoder.encode(chunk))
          } catch {
            cleanup()
          }
        }

        function send(data: StreamEventPayload) {
          writeChunk(`data: ${JSON.stringify(data)}\n\n`)
        }

        function cleanup() {
          if (closed) return
          closed = true
          if (heartbeat) {
            clearInterval(heartbeat)
            heartbeat = null
          }
          if (releaseClient) {
            releaseClient()
            releaseClient = null
          }
          try {
            pass.end()
          } catch {
            // ignore
          }
        }

        writeChunk(': connected\n\n')
        heartbeat = setInterval(() => {
          writeChunk('event: ping\ndata: {}\n\n')
        }, 15000)

        try {
          const handle = await acquireGatewayClient(key, {
            onEvent(event) {
              // Safety-net filter: the PersistentGatewayConnection already
              // routes events by session key, but we double-check here to
              // prevent any cross-session leakage in the SSE stream.
              const p = event.payload as Record<string, unknown> | undefined
              const eventSessionKey = typeof p?.sessionKey === 'string' ? p.sessionKey : ''

              // Allow events without a sessionKey (health, presence, tick, etc.)
              // Allow events matching this session's key (segment-based match
              // on ':'-separated parts, e.g. 'agent:main:main' matches 'main').
              if (eventSessionKey && eventSessionKey !== key && !eventSessionKey.split(':').includes(key)) {
                return
              }

              send({
                event: event.event,
                payload: event.payload,
                seq: event.seq,
                stateVersion: event.stateVersion,
              })
            },
            onError(error) {
              send({ event: 'error', payload: error.message })
            },
          })

          if (closed) {
            handle.release()
          } else {
            releaseClient = handle.release
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          send({ event: 'error', payload: message })
          cleanup()
        }

        request.signal.addEventListener('abort', cleanup, { once: true })

        const webStream = Readable.toWeb(pass) as ReadableStream<Uint8Array>

        return new Response(webStream, {
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache, no-transform',
            connection: 'keep-alive',
            'x-accel-buffering': 'no',
          },
        })
      },
    },
  },
})
