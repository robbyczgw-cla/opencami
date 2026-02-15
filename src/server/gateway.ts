import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'

// ─── Types ──────────────────────────────────────────────────────────────

type GatewayFrame =
  | { type: 'req'; id: string; method: string; params?: unknown }
  | {
      type: 'res'
      id: string
      ok: boolean
      payload?: unknown
      error?: { code: string; message: string; details?: unknown }
    }
  | { type: 'event'; event: string; payload?: unknown; seq?: number }

type ConnectParams = {
  minProtocol: number
  maxProtocol: number
  client: {
    id: string
    displayName?: string
    version: string
    platform: string
    mode: string
    instanceId?: string
  }
  auth?: { token?: string; password?: string }
  role?: 'operator' | 'node'
  scopes?: Array<string>
}

export type GatewayEvent = {
  event: string
  payload: Record<string, unknown>
  seq?: number
}

export type StreamListener = (event: GatewayEvent) => void

// ─── Config helpers ─────────────────────────────────────────────────────

function getGatewayConfig() {
  const url = process.env.CLAWDBOT_GATEWAY_URL?.trim() || 'ws://127.0.0.1:18789'
  const token = process.env.CLAWDBOT_GATEWAY_TOKEN?.trim() || ''
  const password = process.env.CLAWDBOT_GATEWAY_PASSWORD?.trim() || ''

  if (!token && !password) {
    throw new Error(
      'Missing gateway auth. Set CLAWDBOT_GATEWAY_TOKEN (recommended) or CLAWDBOT_GATEWAY_PASSWORD in the server environment.',
    )
  }

  return { url, token, password }
}

function buildConnectParams(token: string, password: string): ConnectParams {
  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: 'gateway-client',
      displayName: 'OpenCami',
      version: 'dev',
      platform: process.platform,
      mode: 'ui',
      instanceId: randomUUID(),
    },
    auth: {
      token: token || undefined,
      password: password || undefined,
    },
    role: 'operator',
    scopes: ['operator.read', 'operator.write', 'operator.admin'],
  }
}

// ─── Persistent Gateway Connection (Singleton) ─────────────────────────

type PendingRpc = {
  resolve: (payload: unknown) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

class PersistentGatewayConnection {
  private ws: WebSocket | null = null
  private connected = false
  private connectPromise: Promise<void> | null = null
  private pendingRpcs = new Map<string, PendingRpc>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private maxReconnectDelay = 30_000
  private destroyed = false

  // Event listeners keyed by sessionKey — each sessionKey can have multiple listeners
  private sessionListeners = new Map<string, Set<StreamListener>>()
  // Listeners that receive ALL events (for debugging or global subscriptions)
  private globalListeners = new Set<StreamListener>()
  // Event buffer: store recent events per sessionKey so late subscribers don't miss them
  private eventBuffer = new Map<string, { events: GatewayEvent[]; timer: ReturnType<typeof setTimeout> }>()

  get isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN
  }

  /** Ensure the persistent connection is up and authenticated. */
  async ensureConnected(): Promise<void> {
    if (this.isConnected) return
    if (this.connectPromise) return this.connectPromise
    this.connectPromise = this._connect()
    try {
      await this.connectPromise
    } finally {
      this.connectPromise = null
    }
  }

  private async _connect(): Promise<void> {
    if (this.destroyed) throw new Error('Connection destroyed')

    const { url, token, password } = getGatewayConfig()
    const ws = new WebSocket(url)
    this.ws = ws

    // Wait for open
    await new Promise<void>((resolve, reject) => {
      const onOpen = () => { cleanup(); resolve() }
      const onError = (err: Error) => { cleanup(); reject(new Error(`WS open error: ${err.message}`)) }
      const cleanup = () => { ws.off('open', onOpen); ws.off('error', onError) }
      ws.on('open', onOpen)
      ws.on('error', onError)
    })

    // Wire message handler
    ws.on('message', (data: WebSocket.Data) => this._onMessage(data))
    ws.on('close', () => this._onClose())
    ws.on('error', () => {}) // Prevent unhandled error crash

    // Connect handshake
    const connectId = randomUUID()
    const connectParams = buildConnectParams(token, password)
    ws.send(JSON.stringify({
      type: 'req',
      id: connectId,
      method: 'connect',
      params: connectParams,
    }))

    await this._waitForRes(connectId, 10_000)
    this.connected = true
    this.reconnectDelay = 1000
    console.log('[gateway-ws] Persistent connection established')
  }

  private _onMessage(data: WebSocket.Data) {
    try {
      const str = typeof data === 'string' ? data : data.toString()
      const parsed = JSON.parse(str) as GatewayFrame

      if (parsed.type === 'res') {
        const pending = this.pendingRpcs.get(parsed.id)
        if (pending) {
          this.pendingRpcs.delete(parsed.id)
          clearTimeout(pending.timer)
          if (parsed.ok) {
            pending.resolve(parsed.payload)
          } else {
            pending.reject(new Error(parsed.error?.message ?? 'gateway error'))
          }
        }
        return
      }

      if (parsed.type === 'event') {
        const event: GatewayEvent = {
          event: parsed.event,
          payload: (parsed.payload ?? {}) as Record<string, unknown>,
          seq: parsed.seq,
        }

        // Determine which sessionKey this event belongs to
        const sessionKey = this._extractSessionKey(event)

        // Notify global listeners
        for (const listener of this.globalListeners) {
          try { listener(event) } catch {}
        }

        // Notify session-specific listeners
        if (sessionKey) {
          const listeners = this.sessionListeners.get(sessionKey)
          if (listeners && listeners.size > 0) {
            for (const listener of listeners) {
              try { listener(event) } catch {}
            }
          } else {
            // No listeners yet — buffer the event so late subscribers can catch up
            let buf = this.eventBuffer.get(sessionKey)
            if (!buf) {
              const timer = setTimeout(() => { this.eventBuffer.delete(sessionKey) }, 10_000)
              buf = { events: [], timer }
              this.eventBuffer.set(sessionKey, buf)
            }
            buf.events.push(event)
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  private _extractSessionKey(event: GatewayEvent): string | null {
    // Events typically carry sessionKey in the payload
    const payload = event.payload
    if (typeof payload?.sessionKey === 'string') return payload.sessionKey
    if (typeof payload?.session === 'string') return payload.session
    // Some events nest it deeper
    if (payload?.data && typeof (payload.data as any)?.sessionKey === 'string') {
      return (payload.data as any).sessionKey
    }
    return null
  }

  private _onClose() {
    const wasConnected = this.connected
    this.connected = false
    this.ws = null

    // Reject all pending RPCs
    for (const [, pending] of this.pendingRpcs) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Connection closed'))
    }
    this.pendingRpcs.clear()

    if (wasConnected) {
      console.log('[gateway-ws] Connection lost, scheduling reconnect...')
    }

    if (!this.destroyed) {
      this._scheduleReconnect()
    }
  }

  private _scheduleReconnect() {
    if (this.reconnectTimer) return
    const delay = this.reconnectDelay
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
    console.log(`[gateway-ws] Reconnecting in ${delay}ms...`)
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.ensureConnected()
      } catch (err) {
        console.error('[gateway-ws] Reconnect failed:', err instanceof Error ? err.message : err)
        // _onClose will schedule the next attempt
      }
    }, delay)
  }

  private _waitForRes(id: string, timeoutMs = 30_000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRpcs.delete(id)
        reject(new Error(`RPC timeout waiting for ${id}`))
      }, timeoutMs)
      this.pendingRpcs.set(id, { resolve, reject, timer })
    })
  }

  /** Send an RPC request over the persistent connection. */
  async rpc<T = unknown>(method: string, params?: unknown, timeoutMs = 30_000): Promise<T> {
    await this.ensureConnected()

    const id = randomUUID()
    const frame: GatewayFrame = { type: 'req', id, method, params }

    this.ws!.send(JSON.stringify(frame))
    const payload = await this._waitForRes(id, timeoutMs)
    return payload as T
  }

  /** Subscribe to events for a specific sessionKey. Returns an unsubscribe function. */
  subscribe(sessionKey: string, listener: StreamListener): () => void {
    let listeners = this.sessionListeners.get(sessionKey)
    if (!listeners) {
      listeners = new Set()
      this.sessionListeners.set(sessionKey, listeners)
    }
    listeners.add(listener)

    // Flush any buffered events to the new subscriber
    const buf = this.eventBuffer.get(sessionKey)
    if (buf) {
      this.eventBuffer.delete(sessionKey)
      clearTimeout(buf.timer)
      for (const event of buf.events) {
        try { listener(event) } catch {}
      }
    }

    return () => {
      listeners!.delete(listener)
      if (listeners!.size === 0) {
        this.sessionListeners.delete(sessionKey)
      }
    }
  }

  /** Subscribe to ALL events. Returns an unsubscribe function. */
  subscribeAll(listener: StreamListener): () => void {
    this.globalListeners.add(listener)
    return () => { this.globalListeners.delete(listener) }
  }

  destroy() {
    this.destroyed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.sessionListeners.clear()
    this.globalListeners.clear()
  }
}

// Singleton instance
let _instance: PersistentGatewayConnection | null = null

function getPersistentConnection(): PersistentGatewayConnection {
  if (!_instance) {
    _instance = new PersistentGatewayConnection()
  }
  return _instance
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Send an RPC over the persistent gateway connection.
 * This ensures events come back on the SAME connection.
 */
export async function gatewayRpc<TPayload = unknown>(
  method: string,
  params?: unknown,
): Promise<TPayload> {
  const conn = getPersistentConnection()
  return conn.rpc<TPayload>(method, params)
}

/**
 * Subscribe to gateway events for a specific sessionKey.
 * Returns an unsubscribe function.
 */
export function subscribeGatewayEvents(
  sessionKey: string,
  listener: StreamListener,
): () => void {
  const conn = getPersistentConnection()
  return conn.subscribe(sessionKey, listener)
}

/**
 * Subscribe to ALL gateway events.
 * Returns an unsubscribe function.
 */
export function subscribeAllGatewayEvents(
  listener: StreamListener,
): () => void {
  const conn = getPersistentConnection()
  return conn.subscribeAll(listener)
}

/**
 * Get the persistent connection instance (for status checks).
 */
export function getGatewayConnection(): PersistentGatewayConnection {
  return getPersistentConnection()
}

/**
 * Simple connect check — ensures we can connect and authenticate.
 */
export async function gatewayConnectCheck(): Promise<void> {
  const conn = getPersistentConnection()
  await conn.ensureConnected()
}
