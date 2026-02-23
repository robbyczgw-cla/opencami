import { randomUUID } from 'node:crypto'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
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
  caps?: Array<string>
  auth?: { token?: string; password?: string; deviceToken?: string }
  role?: 'operator' | 'node'
  scopes?: Array<string>
  device?: {
    id: string
    publicKey: string
    signature: string
    signedAt: number
    nonce: string
  }
  userAgent?: string
  locale?: string
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

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function base64UrlEncode(buf: Buffer) {
  return buf
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '')
}

function derivePublicKeyRaw(publicKeyPem: string) {
  const spki = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' }) as Buffer
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length)
  }
  return spki
}

function fingerprintPublicKey(publicKeyPem: string) {
  const raw = derivePublicKeyRaw(publicKeyPem)
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function resolveDeviceIdentityPath() {
  // Keep OpenCami identity separate from OpenClaw's; stable per OpenCami install.
  return path.join(os.homedir(), '.opencami', 'identity', 'device.json')
}

function loadOrCreateDeviceIdentity(filePath = resolveDeviceIdentityPath()) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const parsed = JSON.parse(raw)
      if (
        parsed?.version === 1 &&
        typeof parsed.deviceId === 'string' &&
        typeof parsed.publicKeyPem === 'string' &&
        typeof parsed.privateKeyPem === 'string'
      ) {
        const derivedId = fingerprintPublicKey(parsed.publicKeyPem)
        if (derivedId && derivedId !== parsed.deviceId) {
          const updated = { ...parsed, deviceId: derivedId }
          fs.writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`, { mode: 0o600 })
          try { fs.chmodSync(filePath, 0o600) } catch {}
          return { deviceId: derivedId, publicKeyPem: parsed.publicKeyPem, privateKeyPem: parsed.privateKeyPem }
        }
        return { deviceId: parsed.deviceId, publicKeyPem: parsed.publicKeyPem, privateKeyPem: parsed.privateKeyPem }
      }
    }
  } catch {}

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const deviceId = fingerprintPublicKey(publicKeyPem)

  ensureDir(filePath)
  const stored = {
    version: 1,
    deviceId,
    publicKeyPem,
    privateKeyPem,
    createdAtMs: Date.now(),
  }
  fs.writeFileSync(filePath, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 })
  try { fs.chmodSync(filePath, 0o600) } catch {}

  return { deviceId, publicKeyPem, privateKeyPem }
}

function signDevicePayload(privateKeyPem: string, payload: string) {
  const key = crypto.createPrivateKey(privateKeyPem)
  return base64UrlEncode(crypto.sign(null, Buffer.from(payload, 'utf8'), key))
}

function publicKeyRawBase64UrlFromPem(publicKeyPem: string) {
  return base64UrlEncode(derivePublicKeyRaw(publicKeyPem))
}

function buildDeviceAuthPayload(args: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAtMs: number
  token: string | null
  nonce: string
}) {
  const scopes = args.scopes.join(',')
  const token = args.token ?? ''
  // Must match OpenClaw device identity format.
  return ['v2', args.deviceId, args.clientId, args.clientMode, args.role, scopes, String(args.signedAtMs), token, args.nonce].join('|')
}

function loadOrCreateInstanceId() {
  const filePath = path.join(os.homedir(), '.opencami', 'identity', 'instance-id.txt')
  try {
    if (fs.existsSync(filePath)) {
      const v = fs.readFileSync(filePath, 'utf8').trim()
      if (v) return v
    }
  } catch {}
  const v = randomUUID()
  ensureDir(filePath)
  fs.writeFileSync(filePath, `${v}\n`, { mode: 0o600 })
  try { fs.chmodSync(filePath, 0o600) } catch {}
  return v
}

function buildConnectParams(token: string, password: string, nonce: string): ConnectParams {
  const clientId = 'openclaw-control-ui'
  const clientMode = 'webchat'
  const role = 'operator'
  const scopes = ['operator.read', 'operator.write']

  if (!nonce) {
    throw new Error(
      'OpenClaw did not send connect.challenge nonce in time. ' +
        'If you are connecting cross-origin, ensure your origin is allowed (gateway.controlUi.allowedOrigins).',
    )
  }

  const identity = loadOrCreateDeviceIdentity()
  const signedAtMs = Date.now()
  const payload = buildDeviceAuthPayload({
    deviceId: identity.deviceId,
    clientId,
    clientMode,
    role,
    scopes,
    signedAtMs,
    token: token || null,
    nonce,
  })

  const signature = signDevicePayload(identity.privateKeyPem, payload)

  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: clientId,
      displayName: 'OpenCami',
      version: 'dev',
      platform: process.platform,
      mode: clientMode,
      instanceId: loadOrCreateInstanceId(),
    },
    caps: [],
    auth: {
      token: token || undefined,
      password: password || undefined,
    },
    role: 'operator',
    scopes,
    device: {
      id: identity.deviceId,
      publicKey: publicKeyRawBase64UrlFromPem(identity.publicKeyPem),
      signature,
      signedAt: signedAtMs,
      nonce,
    },
    userAgent: `opencami/${process.env.npm_package_version ?? 'dev'} (node ${process.version})`,
    locale: process.env.LANG || 'en',
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

    // Some gateway deployments enforce Origin allowlists for Control UI clients.
    // If OPENCAMI_ORIGIN is set, send it as the WS Origin header so it can be allowlisted via
    // gateway.controlUi.allowedOrigins.
    const origin = process.env.OPENCAMI_ORIGIN?.trim()
    const ws = origin
      ? new WebSocket(url, { headers: { Origin: origin } })
      : new WebSocket(url)
    this.ws = ws

    // Wait for open
    await new Promise<void>((resolve, reject) => {
      const onOpen = () => { cleanup(); resolve() }
      const onError = (err: Error) => { cleanup(); reject(new Error(`WS open error: ${err.message}`)) }
      const cleanup = () => { ws.off('open', onOpen); ws.off('error', onError) }
      ws.on('open', onOpen)
      ws.on('error', onError)
    })

    // Capture connect.challenge nonce ASAP after open (before generic message handler)
    const nonce = await new Promise<string>((resolve) => {
      let done = false
      const timer = setTimeout(() => {
        if (done) return
        done = true
        resolve('')
      }, 3000)

      const onMessage = (data: WebSocket.Data) => {
        try {
          const str = typeof data === 'string' ? data : data.toString()
          const parsed = JSON.parse(str) as GatewayFrame
          if (parsed.type === 'event' && parsed.event === 'connect.challenge') {
            const n = (parsed.payload as any)?.nonce
            if (typeof n === 'string' && n.length > 0) {
              clearTimeout(timer)
              ws.off('message', onMessage)
              if (done) return
              done = true
              resolve(n)
            }
          }
        } catch {}
      }

      ws.on('message', onMessage)
    })

    // Wire generic message handler
    ws.on('message', (data: WebSocket.Data) => this._onMessage(data))
    ws.on('close', () => this._onClose())
    ws.on('error', () => {}) // Prevent unhandled error crash

    // Connect handshake (supports device identity challenge nonce)
    const connectId = randomUUID()

    const shouldFallback =
      process.env.OPENCAMI_DEVICE_AUTH_FALLBACK === '1' ||
      process.env.OPENCAMI_DEVICE_AUTH_FALLBACK === 'true'

    try {
      const connectParams = buildConnectParams(token, password, nonce)
      ws.send(
        JSON.stringify({
          type: 'req',
          id: connectId,
          method: 'connect',
          params: connectParams,
        }),
      )

      const hello = await this._waitForRes(connectId, 10_000)
      // Optional sanity check: ensure operator.read was granted.
      const grantedScopes = (hello as any)?.auth?.scopes
      if (Array.isArray(grantedScopes) && !grantedScopes.includes('operator.read')) {
        throw new Error(
          `Gateway connected but missing required scope: operator.read (granted: ${grantedScopes.join(', ')})`,
        )
      }
    } catch (err) {
      if (!shouldFallback) throw err

      console.warn(
        '[gateway-ws] Device auth connect failed; retrying without device identity (fallback enabled):',
        err instanceof Error ? err.message : err,
      )

      const fallbackId = randomUUID()
      const fallbackParams: ConnectParams = {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'openclaw-control-ui',
          displayName: 'OpenCami',
          version: 'dev',
          platform: process.platform,
          mode: 'webchat',
          instanceId: loadOrCreateInstanceId(),
        },
        caps: [],
        auth: {
          token: token || undefined,
          password: password || undefined,
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        userAgent: `opencami/${process.env.npm_package_version ?? 'dev'} (node ${process.version})`,
        locale: process.env.LANG || 'en',
      }

      ws.send(
        JSON.stringify({
          type: 'req',
          id: fallbackId,
          method: 'connect',
          params: fallbackParams,
        }),
      )

      await this._waitForRes(fallbackId, 10_000)
    }

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

// Survive Vite SSR HMR program reloads: module-level vars reset but globalThis persists.
// Without this, every file-save that triggers a program reload creates a NEW connection
// and drops all existing SSE subscriptions — leaving the browser stuck on "generating".
const _g = globalThis as typeof globalThis & {
  __opencamiGatewayInstance?: PersistentGatewayConnection
}

function getPersistentConnection(): PersistentGatewayConnection {
  if (!_g.__opencamiGatewayInstance) {
    _g.__opencamiGatewayInstance = new PersistentGatewayConnection()
  }
  _instance = _g.__opencamiGatewayInstance
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
