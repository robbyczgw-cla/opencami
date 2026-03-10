import { PassThrough } from 'node:stream'
import { Readable } from 'node:stream'
import { createFileRoute } from '@tanstack/react-router'
import {
  subscribeGatewayEvents,
  type GatewayEvent,
} from '../../server/gateway'

export const Route = createFileRoute('/api/stream')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const sessionKey = url.searchParams.get('sessionKey')

        if (!sessionKey) {
          return new Response(
            JSON.stringify({ ok: false, error: 'sessionKey required' }),
            { status: 400, headers: { 'content-type': 'application/json' } },
          )
        }

        // Use Node.js PassThrough stream — Web ReadableStream gets buffered by
        // Vite's dev server, causing the browser to only see data after the
        // stream ends. PassThrough + Readable.toWeb() bypasses this buffering.
        const pass = new PassThrough()
        const encoder = new TextEncoder()

        let closed = false
        let unsubscribe: (() => void) | null = null
        let doneFallbackTimer: ReturnType<typeof setTimeout> | null = null

        function clearDoneFallbackTimer() {
          if (!doneFallbackTimer) return
          clearTimeout(doneFallbackTimer)
          doneFallbackTimer = null
        }

        function sendSSE(event: string, data: unknown) {
          if (closed) return
          try {
            pass.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          } catch {
            // stream may have closed
          }
        }

        function cleanup() {
          if (closed) return
          closed = true
          clearDoneFallbackTimer()
          if (unsubscribe) {
            unsubscribe()
            unsubscribe = null
          }
          try { pass.end() } catch {}
        }

        // Send initial ping to establish connection
        pass.write(encoder.encode(': connected\n\n'))

        // Track whether we've received agent-stream events.
        // If we get agent events, prefer those for deltas (they're raw
        // token deltas). chat.delta events contain accumulated buffered
        // text which can overlap / duplicate the agent stream.
        let gotAgentStream = false

        unsubscribe = subscribeGatewayEvents(sessionKey, (evt: GatewayEvent) => {
          if (evt.event === 'agent') {
            const payload = evt.payload as Record<string, unknown>
            const agentStream = payload.stream as string | undefined

            if (agentStream === 'assistant') {
              gotAgentStream = true
              const data = (payload.data ?? payload) as Record<string, unknown>
              const text =
                typeof data.delta === 'string'
                  ? data.delta
                  : typeof data.text === 'string'
                    ? data.text
                    : typeof payload.text === 'string'
                      ? payload.text
                      : typeof payload.delta === 'string'
                        ? payload.delta
                        : ''
              if (text) {
                sendSSE('delta', { text, sessionKey })
              }
            } else if (agentStream === 'tool') {
              gotAgentStream = true
              const tdata = (payload.data ?? payload) as Record<string, unknown>
              sendSSE('tool', {
                name: tdata.name ?? tdata.toolName ?? payload.name ?? '',
                status: tdata.phase ?? tdata.status ?? payload.phase ?? 'running',
                id: tdata.id ?? tdata.toolCallId ?? payload.id ?? '',
                sessionKey,
              })
            } else if (agentStream === 'lifecycle') {
              const ldata = (payload.data ?? payload) as Record<string, unknown>
              const phase = (ldata.phase ?? payload.phase) as string | undefined
              const error =
                (ldata.error as string | undefined) ??
                (payload.error as string | undefined)

              if (phase === 'error') {
                clearDoneFallbackTimer()
                sendSSE('done', {
                  sessionKey,
                  status: phase,
                  error,
                })
                cleanup()
              } else if (phase === 'end') {
                // Tool-enabled runs can emit lifecycle:end before the gateway
                // broadcasts chat.final. If we close the SSE immediately, the
                // client refetches history too early and misses the final
                // assistant message until a manual refresh. Prefer chat.final
                // when it arrives, but keep a short fallback so the stream
                // still completes if chat.final never shows up.
                clearDoneFallbackTimer()
                doneFallbackTimer = setTimeout(() => {
                  console.warn('[api/stream] lifecycle:end fallback -> done', {
                    sessionKey,
                    event: evt.event,
                    stream: agentStream,
                    payload,
                  })
                  sendSSE('done', {
                    sessionKey,
                    status: phase,
                  })
                  cleanup()
                }, 1500)
              }
            }
          } else if (evt.event === 'chat') {
            const payload = evt.payload as Record<string, unknown>
            // Gateway sends `state` (not `kind`) — "delta" or "final"
            const state = (payload.state ?? payload.kind) as string | undefined
            const msg = payload.message as Record<string, unknown> | undefined

            if (state === 'delta' && !gotAgentStream) {
              const content = Array.isArray(msg?.content)
                ? (msg.content as Record<string, unknown>[])
                : []
              const firstBlock = content[0]
              const text: string =
                typeof firstBlock?.text === 'string'
                  ? firstBlock.text
                  : typeof payload.text === 'string'
                    ? payload.text
                    : typeof payload.delta === 'string'
                      ? payload.delta
                      : ''
              if (text) {
                sendSSE('delta', { text, sessionKey })
              }
            } else if (state === 'final') {
              clearDoneFallbackTimer()
              sendSSE('done', { sessionKey, status: 'end' })
              cleanup()
            } else if (state === 'error') {
              clearDoneFallbackTimer()
              sendSSE('done', {
                sessionKey,
                status: 'error',
                error: payload.errorMessage,
              })
              cleanup()
            }
          }
        })

        // Handle client disconnect
        request.signal?.addEventListener('abort', cleanup)

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
