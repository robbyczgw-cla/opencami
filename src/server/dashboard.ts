import os from 'node:os'
import { execSync } from 'node:child_process'

const GATEWAY_REST_BASE = 'http://127.0.0.1:18789'

type CpuTimes = {
  idle: number
  total: number
}

export type SystemStats = {
  cpu: { usage: number }
  ram: { used: number; total: number; percent: number }
  disk: { used: number; total: number; percent: number }
}

export type GatewayStats = {
  activeSessions: number
  tokensToday: number
  costToday: number
}

export type CronOverviewItem = {
  id: string
  name: string
  schedule: string
  nextRun: string | null
  lastRun: string | null
  lastStatus: 'ok' | 'error' | 'unknown'
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function sampleCpuTimes(): CpuTimes {
  const cpus = os.cpus()
  let idle = 0
  let total = 0

  for (const cpu of cpus) {
    idle += cpu.times.idle
    total +=
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys +
      cpu.times.idle +
      cpu.times.irq
  }

  return { idle, total }
}

async function getCpuUsagePercent(sampleMs = 500): Promise<number> {
  const start = sampleCpuTimes()
  await new Promise<void>((resolve) => setTimeout(resolve, sampleMs))
  const end = sampleCpuTimes()

  const idleDelta = end.idle - start.idle
  const totalDelta = end.total - start.total

  if (totalDelta <= 0) return 0
  return clampPercent(((totalDelta - idleDelta) / totalDelta) * 100)
}

function getDiskStats(): { used: number; total: number; percent: number } {
  try {
    const raw = execSync('df -k / | tail -1', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()

    const parts = raw.split(/\s+/)
    if (parts.length < 5) {
      return { used: 0, total: 0, percent: 0 }
    }

    const totalKb = Number(parts[1])
    const usedKb = Number(parts[2])

    if (!Number.isFinite(totalKb) || !Number.isFinite(usedKb) || totalKb <= 0) {
      return { used: 0, total: 0, percent: 0 }
    }

    const total = totalKb * 1024
    const used = usedKb * 1024
    const percent = clampPercent((used / total) * 100)

    return { used, total, percent }
  } catch {
    return { used: 0, total: 0, percent: 0 }
  }
}

function parseNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

async function fetchGatewayJson(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${GATEWAY_REST_BASE}${path}`)
    if (!res.ok) return null
    return (await res.json()) as unknown
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function asArray(value: unknown): Array<unknown> {
  return Array.isArray(value) ? value : []
}

export async function getSystemStats(): Promise<SystemStats> {
  const totalRam = os.totalmem()
  const freeRam = os.freemem()
  const usedRam = Math.max(0, totalRam - freeRam)
  const ramPercent = totalRam > 0 ? clampPercent((usedRam / totalRam) * 100) : 0

  const [cpuUsage, disk] = await Promise.all([
    getCpuUsagePercent(500),
    Promise.resolve(getDiskStats()),
  ])

  return {
    cpu: { usage: cpuUsage },
    ram: {
      used: usedRam,
      total: totalRam,
      percent: ramPercent,
    },
    disk,
  }
}

export async function getGatewayStats(): Promise<GatewayStats> {
  const sessionsPayload = await fetchGatewayJson('/api/sessions')
  const sessionsRecord = asRecord(sessionsPayload)
  const sessions = asArray(sessionsRecord.sessions)

  const usagePayload =
    (await fetchGatewayJson('/api/usage/today')) ??
    (await fetchGatewayJson('/api/metrics/today')) ??
    (await fetchGatewayJson('/api/stats/today'))

  const usage = asRecord(usagePayload)

  return {
    activeSessions: sessions.length,
    tokensToday: parseNumber(
      usage.tokensToday ?? usage.tokens ?? usage.totalTokens,
    ),
    costToday: parseNumber(usage.costToday ?? usage.cost ?? usage.totalCost),
  }
}

function toIsoMaybe(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value) && value > 0)
    return new Date(value).toISOString()
  return null
}

function deriveSchedule(job: Record<string, unknown>): string {
  const schedule = asRecord(job.schedule)
  const kind = typeof schedule.kind === 'string' ? schedule.kind : ''
  const expr = typeof schedule.expr === 'string' ? schedule.expr : ''

  if (expr) return expr
  if (kind) return kind
  return '—'
}

export async function getCronOverview(): Promise<Array<CronOverviewItem>> {
  const payload =
    (await fetchGatewayJson('/api/cron/jobs')) ??
    (await fetchGatewayJson('/api/cron'))

  const root = asRecord(payload)
  const rootJobs = asArray(root.jobs)
  const jobs = asArray(rootJobs.length > 0 ? rootJobs : payload)

  const parsed: Array<CronOverviewItem> = []

  for (const item of jobs) {
    const job = asRecord(item)
    const id = typeof job.id === 'string' ? job.id : ''
    if (!id) continue

    const state = asRecord(job.state)
    const rawStatus = state.lastStatus
    const lastStatus: CronOverviewItem['lastStatus'] =
      rawStatus === 'ok' || rawStatus === 'error' ? rawStatus : 'unknown'

    parsed.push({
      id,
      name:
        typeof job.name === 'string' && job.name.trim().length > 0
          ? job.name
          : id,
      schedule: deriveSchedule(job),
      nextRun: toIsoMaybe(state.nextRunAtMs ?? state.nextRun ?? job.nextRun),
      lastRun: toIsoMaybe(state.lastRunAtMs ?? state.lastRun ?? job.lastRun),
      lastStatus,
    })
  }

  return parsed
}
