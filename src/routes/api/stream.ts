import { PassThrough } from 'node:stream'
import { Readable } from 'node:stream'
import { createFileRoute } from '@tanstack/react-router'
import {
  subscribeAllGatewayEvents,
  extractGatewayEventSessionKey,
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
        const streamDebugId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        console.log('[stream:sse] connect', { streamDebugId, sessionKey, url: request.url })

        let closed = false
        let unsubscribe: (() => void) | null = null
        let streamedAssistantText = ''
        let pendingDoneTimeout: ReturnType<typeof setTimeout> | null = null
        let pendingLifecycleEndTimeout: ReturnType<typeof setTimeout> | null = null

        function extractMessageText(message: unknown): string {
          if (!message || typeof message !== 'object') return ''
          const content = Array.isArray((message as { content?: unknown }).content)
            ? (message as { content: Array<Record<string, unknown>> }).content
            : []
          return content
            .map((block) => (block?.type === 'text' && typeof block.text === 'string' ? block.text : ''))
            .join('')
        }

        function emitMissingFinalText(finalText: string) {
          if (!finalText) return
          if (!streamedAssistantText) {
            streamedAssistantText = finalText
            sendSSE('delta', { text: finalText, sessionKey })
            return
          }
          if (finalText.startsWith(streamedAssistantText)) {
            const suffix = finalText.slice(streamedAssistantText.length)
            if (suffix) {
              streamedAssistantText = finalText
              sendSSE('delta', { text: suffix, sessionKey })
            }
            return
          }
          if (finalText !== streamedAssistantText) {
            streamedAssistantText = finalText
            sendSSE('delta', { text: finalText, sessionKey })
          }
        }

        function sendSSE(event: string, data: unknown) {
          if (closed) return
          console.log('[stream:sse] emit', { streamDebugId, sessionKey, event, data })
          try {
            pass.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          } catch (error) {
            console.log('[stream:sse] emit failed', {
              streamDebugId,
              sessionKey,
              event,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }

        function clearPendingDoneTimeout() {
          if (!pendingDoneTimeout) return
          clearTimeout(pendingDoneTimeout)
          pendingDoneTimeout = null
        }

        function clearPendingLifecycleEndTimeout() {
          if (!pendingLifecycleEndTimeout) return
          clearTimeout(pendingLifecycleEndTimeout)
          pendingLifecycleEndTimeout = null
        }

        function finishStream(status: string, error?: unknown, delayMs = 0) {
          clearPendingDoneTimeout()
          clearPendingLifecycleEndTimeout()
          const finalize = () => {
            sendSSE('done', {
              sessionKey,
              status,
              error,
            })
            cleanup()
          }
          if (delayMs <= 0) {
            finalize()
            return
          }
          pendingDoneTimeout = setTimeout(finalize, delayMs)
        }

        function cleanup() {
          if (closed) return
          console.log('[stream:sse] cleanup', { streamDebugId, sessionKey })
          closed = true
          clearPendingDoneTimeout()
          clearPendingLifecycleEndTimeout()
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

        // Subscribe to ALL events and match by sessionKey prefix/suffix.
        // The browser sends sessionKey like "main" but events arrive with
        // full keys like "agent:main:main" or "agent:main:<uuid>".
        // We need to catch both.
        const matchesSession = (evtKey: string | null): boolean => {
          if (!evtKey) return false
          if (evtKey === sessionKey) return true
          const parts = evtKey.split(':')
          return parts.includes(sessionKey) || evtKey.startsWith(sessionKey + ':') || evtKey.endsWith(':' + sessionKey)
        }

        unsubscribe = subscribeAllGatewayEvents((evt: GatewayEvent) => {
          const evtSessionKey = extractGatewayEventSessionKey(evt)
          const matched = matchesSession(evtSessionKey)

          console.log('[stream:sse] gateway event', {
            streamDebugId,
            requestedSessionKey: sessionKey,
            evtSessionKey,
            matched,
            event: evt.event,
            seq: evt.seq ?? null,
            payloadKeys: Object.keys(evt.payload ?? {}),
            dataKeys:
              evt.payload?.data && typeof evt.payload.data === 'object'
                ? Object.keys(evt.payload.data as Record<string, unknown>)
                : [],
          })

          if (!matched) return

          if (evt.event !== 'agent') {
            clearPendingLifecycleEndTimeout()
          }

          if (evt.event === 'agent') {
            const payload = evt.payload as Record<string, unknown>
            const agentStream = payload.stream as string | undefined

            console.log('[stream:sse] matched agent event', {
              streamDebugId,
              sessionKey,
              evtSessionKey,
              agentStream,
              payload,
            })

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
                streamedAssistantText += text
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
              if (phase === 'error') {
                finishStream(
                  phase,
                  ldata.error ?? payload.error,
                  0,
                )
              } else if (phase === 'end') {
                // Gateway should emit chat.final on true turn completion, but in
                // some tool-call flows that final can be missing/delayed. Use a
                // quiescence fallback: if no further events arrive shortly after
                // lifecycle:end, close the SSE to unblock the UI.
                clearPendingLifecycleEndTimeout()
                pendingLifecycleEndTimeout = setTimeout(() => {
                  finishStream('end')
                }, 1200)
              } else {
                clearPendingLifecycleEndTimeout()
              }
            } else {
              clearPendingLifecycleEndTimeout()
            }
          } else if (evt.event === 'chat') {
            const payload = evt.payload as Record<string, unknown>
            console.log('[stream:sse] matched chat event', {
              streamDebugId,
              sessionKey,
              evtSessionKey,
              payload,
            })
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
                streamedAssistantText += text
                sendSSE('delta', { text, sessionKey })
              }
            } else if (state === 'final' || state === 'done') {
              emitMissingFinalText(extractMessageText(msg))
              finishStream('end')
            } else if (state === 'error') {
              finishStream('error', payload.errorMessage)
            }
          }
        })

        // Handle client disconnect
        request.signal?.addEventListener('abort', () => {
          console.log('[stream:sse] abort', { streamDebugId, sessionKey })
          cleanup()
        })

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
