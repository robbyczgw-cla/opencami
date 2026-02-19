import os from 'node:os'
import { execSync } from 'node:child_process'

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
  lastStatus: 'ok' | 'error' | 'idle' | 'unknown'
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
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq
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
    const raw = execSync('df -k / | tail -1', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    const parts = raw.split(/\s+/)
    if (parts.length < 5) return { used: 0, total: 0, percent: 0 }
    const totalKb = Number(parts[1])
    const usedKb = Number(parts[2])
    if (!Number.isFinite(totalKb) || totalKb <= 0) return { used: 0, total: 0, percent: 0 }
    const total = totalKb * 1024
    const used = usedKb * 1024
    return { used, total, percent: clampPercent((used / total) * 100) }
  } catch {
    return { used: 0, total: 0, percent: 0 }
  }
}

export async function getSystemStats(): Promise<SystemStats> {
  const totalRam = os.totalmem()
  const freeRam = os.freemem()
  const usedRam = Math.max(0, totalRam - freeRam)
  const [cpuUsage, disk] = await Promise.all([getCpuUsagePercent(500), Promise.resolve(getDiskStats())])
  return {
    cpu: { usage: cpuUsage },
    ram: { used: usedRam, total: totalRam, percent: totalRam > 0 ? clampPercent((usedRam / totalRam) * 100) : 0 },
    disk,
  }
}

export async function getGatewayStats(): Promise<GatewayStats> {
  try {
    // Use openclaw CLI — gateway has no REST API, only WebSocket
    const sessionsJson = execSync('openclaw sessions list --json 2>/dev/null', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    })
    const sessionsData = JSON.parse(sessionsJson) as { count?: number; sessions?: unknown[] }
    const activeSessions = sessionsData.count ?? sessionsData.sessions?.length ?? 0
    return { activeSessions, tokensToday: 0, costToday: 0 }
  } catch {
    return { activeSessions: 0, tokensToday: 0, costToday: 0 }
  }
}

export async function getCronOverview(): Promise<Array<CronOverviewItem>> {
  try {
    // Use openclaw CLI — returns proper JSON with all job data
    const cronJson = execSync('openclaw cron list --json 2>/dev/null', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    })
    const data = JSON.parse(cronJson) as { jobs?: Array<Record<string, unknown>> }
    const jobs = data.jobs ?? []

    return jobs.slice(0, 6).map((job) => {
      const schedule = job.schedule as Record<string, unknown> | undefined
      const state = job.state as Record<string, unknown> | undefined

      // Build schedule string
      let scheduleStr = '—'
      if (schedule) {
        if (schedule.expr) scheduleStr = String(schedule.expr)
        else if (schedule.kind === 'every' && schedule.everyMs) scheduleStr = `every ${Number(schedule.everyMs) / 1000 / 60}m`
        else if (schedule.kind === 'at') scheduleStr = `at ${schedule.at}`
        else if (schedule.kind) scheduleStr = String(schedule.kind)
      }

      // Next run
      let nextRun: string | null = null
      if (state?.nextRunAtMs && Number(state.nextRunAtMs) > 0) {
        nextRun = new Date(Number(state.nextRunAtMs)).toISOString()
      }

      // Last run
      let lastRun: string | null = null
      if (state?.lastRunAtMs && Number(state.lastRunAtMs) > 0) {
        lastRun = new Date(Number(state.lastRunAtMs)).toISOString()
      }

      // Status
      const rawStatus = state?.lastStatus
      const lastStatus: CronOverviewItem['lastStatus'] =
        rawStatus === 'ok' ? 'ok' :
        rawStatus === 'error' ? 'error' :
        rawStatus === 'idle' ? 'idle' : 'unknown'

      return {
        id: String(job.id ?? ''),
        name: String(job.name ?? job.id ?? 'Unnamed'),
        schedule: scheduleStr,
        nextRun,
        lastRun,
        lastStatus,
      }
    })
  } catch {
    return []
  }
}
