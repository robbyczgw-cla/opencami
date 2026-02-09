import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { readFile } from 'node:fs/promises'
import { gatewayRpc } from '../../server/gateway'

type Agent = {
  id: string
  name: string
  workspace?: string
  model?: string
  emoji?: string
  avatar?: string
  activeSessions?: number
  isDefault?: boolean
}

type ConfigAgent = {
  id: string
  name?: string
  model?: string | { primary: string }
  workspace?: string | null
  emoji?: string
  default?: boolean
}

type AgentsListResponse = {
  agents: Agent[]
}

async function readConfigAgents(): Promise<ConfigAgent[]> {
  try {
    const raw = await readFile(
      `${process.env.HOME || '/root'}/.openclaw/openclaw.json`,
      'utf-8',
    )
    const cfg = JSON.parse(raw) as { agents?: { list?: ConfigAgent[] } }
    return cfg?.agents?.list ?? []
  } catch {
    return []
  }
}

function resolveModel(m: string | { primary: string } | undefined | null): string | undefined {
  if (!m) return undefined
  if (typeof m === 'string') return m
  if (typeof m === 'object' && 'primary' in m) return m.primary
  return undefined
}

export const Route = createFileRoute('/api/agents')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [payload, configAgents] = await Promise.all([
            gatewayRpc<unknown>('agents.list'),
            readConfigAgents(),
          ])
          console.log('[agents.list] raw payload:', JSON.stringify(payload).slice(0, 1000))
          // payload might be { agents: [...] } or [...] directly
          const rpcAgents = Array.isArray(payload) ? payload : Array.isArray((payload as Record<string, unknown>)?.agents) ? (payload as Record<string, unknown>).agents as Agent[] : []

          // Build lookup from config
          const cfgMap = new Map<string, ConfigAgent>()
          for (const c of configAgents) cfgMap.set(c.id, c)

          // Enrich RPC agents with config data
          const agents: Agent[] = (rpcAgents as Agent[]).map((a) => {
            const cfg = cfgMap.get(a.id)
            return {
              ...a,
              name: a.name || cfg?.name || '',
              model: a.model || resolveModel(cfg?.model),
              workspace: a.workspace || cfg?.workspace || undefined,
              emoji: a.emoji || cfg?.emoji,
              isDefault: cfg?.default ?? a.id === 'main',
            }
          })

          return json<AgentsListResponse>({ agents })
        } catch (err) {
          return json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
          const action = typeof body.action === 'string' ? body.action : 'create'

          if (action === 'create') {
            const params: Record<string, unknown> = {}
            if (typeof body.name === 'string') params.name = body.name.trim()
            if (typeof body.workspace === 'string') params.workspace = body.workspace.trim()
            if (typeof body.emoji === 'string') params.emoji = body.emoji.trim()
            if (typeof body.avatar === 'string') params.avatar = body.avatar.trim()

            const payload = await gatewayRpc('agents.create', params)
            return json({ ok: true, ...payload as object })
          }

          if (action === 'update') {
            const params: Record<string, unknown> = {}
            if (typeof body.agentId === 'string') params.agentId = body.agentId.trim()
            if (typeof body.name === 'string') params.name = body.name.trim()
            if (typeof body.workspace === 'string') params.workspace = body.workspace.trim()
            if (typeof body.model === 'string') params.model = body.model.trim()
            if (typeof body.avatar === 'string') params.avatar = body.avatar.trim()

            const payload = await gatewayRpc('agents.update', params)
            return json({ ok: true, ...payload as object })
          }

          if (action === 'delete') {
            const params: Record<string, unknown> = {}
            if (typeof body.agentId === 'string') params.agentId = body.agentId.trim()
            if (typeof body.deleteFiles === 'boolean') params.deleteFiles = body.deleteFiles

            const payload = await gatewayRpc('agents.delete', params)
            return json({ ok: true, ...payload as object })
          }

          return json({ error: 'Unknown action' }, { status: 400 })
        } catch (err) {
          return json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
    },
  },
})
