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

        // Set up SSE stream
        const encoder = new TextEncoder()
        let unsubscribe: (() => void) | null = null
        let closed = false

        const stream = new ReadableStream({
          start(controller) {
            // Send initial comment to establish connection
            controller.enqueue(encoder.encode(': connected\n\n'))

            function sendSSE(event: string, data: unknown) {
              if (closed) return
              try {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                )
              } catch {
                // Stream may have been closed
              }
            }

            // Track whether we've received agent-stream events.
            // If we get agent events, prefer those for deltas (they're raw
            // token deltas).  chat.delta events contain accumulated buffered
            // text which can overlap / duplicate the agent stream.
            let gotAgentStream = false

            // Subscribe to events for this sessionKey
            unsubscribe = subscribeGatewayEvents(sessionKey, (evt: GatewayEvent) => {
              if (evt.event === 'agent') {
                const payload = evt.payload as Record<string, unknown>
                const agentStream = payload.stream as string | undefined

                if (agentStream === 'assistant') {
                  gotAgentStream = true
                  // Assistant text delta — payload.data contains the actual delta
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
                  if (phase === 'end' || phase === 'error') {
                    sendSSE('done', {
                      sessionKey,
                      status: phase,
                      error: phase === 'error' ? payload.error : undefined,
                    })
                  }
                }
              } else if (evt.event === 'chat') {
                const payload = evt.payload as Record<string, unknown>
                const kind = payload.kind as string | undefined

                if (kind === 'delta' && !gotAgentStream) {
                  // Fallback: use chat deltas only if we haven't seen agent
                  // stream events (they would duplicate).
                  const text =
                    typeof payload.text === 'string'
                      ? payload.text
                      : typeof payload.delta === 'string'
                        ? payload.delta
                        : ''
                  if (text) {
                    sendSSE('delta', { text, sessionKey })
                  }
                } else if (kind === 'final') {
                  // Chat final message — always send done
                  sendSSE('done', { sessionKey, status: 'end' })
                }
              }
            })
          },
          cancel() {
            closed = true
            if (unsubscribe) {
              unsubscribe()
              unsubscribe = null
            }
          },
        })

        // Handle client disconnect via abort signal
        if (request.signal) {
          request.signal.addEventListener('abort', () => {
            closed = true
            if (unsubscribe) {
              unsubscribe()
              unsubscribe = null
            }
          })
        }

        return new Response(stream, {
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
