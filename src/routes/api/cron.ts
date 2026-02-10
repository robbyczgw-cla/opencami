import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'

type CronSchedule = {
  kind: 'cron' | 'at' | 'every'
  expr?: string
  tz?: string
}

type CronPayload = {
  kind?: string
  message?: string
  prompt?: string
  model?: string
  [key: string]: unknown
}

type CronDelivery = {
  mode?: string
  channel?: string
  to?: string
  [key: string]: unknown
}

type CronState = {
  nextRunAtMs?: number
  lastRunAtMs?: number
  lastStatus?: 'ok' | 'error'
  lastDurationMs?: number
  lastError?: string
  consecutiveErrors?: number
}

type CronJob = {
  id: string
  name?: string
  enabled: boolean
  schedule: CronSchedule
  payload: CronPayload
  delivery?: CronDelivery
  state?: CronState
}

type CronRun = {
  id: string
  jobId: string
  status: 'ok' | 'error'
  durationMs?: number
  error?: string
  ranAt?: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function toCronJob(value: unknown): CronJob | null {
  const raw = asRecord(value)
  const id = typeof raw.id === 'string' ? raw.id : ''
  if (!id) return null

  const scheduleRaw = asRecord(raw.schedule)
  const kind = scheduleRaw.kind
  const schedule: CronSchedule = {
    kind: kind === 'cron' || kind === 'at' || kind === 'every' ? kind : 'cron',
    expr: typeof scheduleRaw.expr === 'string' ? scheduleRaw.expr : undefined,
    tz: typeof scheduleRaw.tz === 'string' ? scheduleRaw.tz : undefined,
  }

  const stateRaw = asRecord(raw.state)
  const status = stateRaw.lastStatus

  return {
    id,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    schedule,
    payload: asRecord(raw.payload) as CronPayload,
    delivery: asRecord(raw.delivery) as CronDelivery,
    state: {
      nextRunAtMs: typeof stateRaw.nextRunAtMs === 'number' ? stateRaw.nextRunAtMs : undefined,
      lastRunAtMs: typeof stateRaw.lastRunAtMs === 'number' ? stateRaw.lastRunAtMs : undefined,
      lastStatus: status === 'ok' || status === 'error' ? status : undefined,
      lastDurationMs: typeof stateRaw.lastDurationMs === 'number' ? stateRaw.lastDurationMs : undefined,
      lastError: typeof stateRaw.lastError === 'string' ? stateRaw.lastError : undefined,
      consecutiveErrors:
        typeof stateRaw.consecutiveErrors === 'number' ? stateRaw.consecutiveErrors : undefined,
    },
  }
}

function toCronRun(value: unknown): CronRun | null {
  const raw = asRecord(value)
  const id = typeof raw.id === 'string' ? raw.id : ''
  const jobId = typeof raw.jobId === 'string' ? raw.jobId : ''
  const status = raw.status

  if (!id || !jobId || (status !== 'ok' && status !== 'error')) return null

  return {
    id,
    jobId,
    status,
    durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : undefined,
    error: typeof raw.error === 'string' ? raw.error : undefined,
    ranAt: typeof raw.ranAt === 'string' ? raw.ranAt : undefined,
  }
}

function normalizeJobs(payload: unknown): CronJob[] {
  const raw = asRecord(payload)
  const source = Array.isArray(raw.jobs) ? raw.jobs : Array.isArray(payload) ? payload : []
  return source.map(toCronJob).filter((job): job is CronJob => !!job)
}

function normalizeRuns(payload: unknown): CronRun[] {
  const raw = asRecord(payload)
  const source = Array.isArray(raw.runs) ? raw.runs : Array.isArray(payload) ? payload : []
  return source.map(toCronRun).filter((run): run is CronRun => !!run)
}

function parseJobId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 200) return null
  return trimmed
}

function parsePatch(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const patch = value as Record<string, unknown>
  if (Object.keys(patch).length === 0) return null
  return patch
}

export const Route = createFileRoute('/api/cron')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const jobId = parseJobId(url.searchParams.get('jobId'))

          if (jobId) {
            const payload = await gatewayRpc('cron.runs', { jobId })
            return json({ runs: normalizeRuns(payload) })
          }

          const payload = await gatewayRpc('cron.list', { includeDisabled: true })
          return json({ jobs: normalizeJobs(payload) })
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
          const jobId = parseJobId(body.jobId)

          if (!jobId) {
            return json({ ok: false, error: 'jobId is required' }, { status: 400 })
          }

          const payload = await gatewayRpc('cron.run', { jobId })
          return json({ ok: true, ...asRecord(payload) })
        } catch (err) {
          return json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
      PATCH: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
          const jobId = parseJobId(body.jobId)
          const patch = parsePatch(body.patch)

          if (!jobId) {
            return json({ ok: false, error: 'jobId is required' }, { status: 400 })
          }
          if (!patch) {
            return json({ ok: false, error: 'patch is required' }, { status: 400 })
          }

          const payload = await gatewayRpc('cron.update', { jobId, patch })
          return json({ ok: true, ...asRecord(payload) })
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
