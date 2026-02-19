import os from 'node:os'
import { execSync } from 'node:child_process'

type CpuTimes = {
  idle: number
  total: number
}

export type SystemStats = {
  cpu: number
  ram: { used: number; total: number }
  disk: { used: number; total: number }
  load: [number, number, number]
  uptime: string
  network: { rx: string; tx: string }
  topProcesses: Array<{ name: string; cpu: number; mem: number }>
  cpuModel: string
  cores: number
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
  enabled: boolean
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

function getDiskStats(): { used: number; total: number } {
  try {
    const raw = execSync('df -k / | tail -1', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const parts = raw.split(/\s+/)
    if (parts.length < 5) return { used: 0, total: 0 }
    const totalKb = Number(parts[1])
    const usedKb = Number(parts[2])
    if (!Number.isFinite(totalKb) || totalKb <= 0) return { used: 0, total: 0 }
    const total = totalKb * 1024
    const used = usedKb * 1024
    return { used, total }
  } catch {
    return { used: 0, total: 0 }
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function formatBytesCompact(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = Math.max(0, bytes)
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

function getNetworkIo(): { rx: string; tx: string } {
  try {
    const netRaw = execSync('cat /proc/net/dev', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    })

    const lines = netRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    let selected: { iface: string; rx: number; tx: number } | null = null

    for (const line of lines.slice(2)) {
      const [ifaceRaw, dataRaw] = line.split(':')
      if (!ifaceRaw || !dataRaw) continue
      const iface = ifaceRaw.trim()
      const fields = dataRaw.trim().split(/\s+/)
      if (fields.length < 16) continue

      const rx = Number(fields[0])
      const tx = Number(fields[8])
      if (!Number.isFinite(rx) || !Number.isFinite(tx)) continue

      const entry = { iface, rx, tx }
      if (iface !== 'lo') {
        selected = entry
        break
      }
      if (!selected) selected = entry
    }

    if (!selected) return { rx: '0 MB', tx: '0 MB' }

    return {
      rx: formatBytesCompact(selected.rx),
      tx: formatBytesCompact(selected.tx),
    }
  } catch {
    return { rx: '0 MB', tx: '0 MB' }
  }
}

function getTopProcesses(): Array<{ name: string; cpu: number; mem: number }> {
  try {
    const procs = execSync('ps aux --sort=-%cpu | head -6 | tail -5', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000,
    })

    return procs
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\s+/)
        if (parts.length < 11) return null
        const cpu = Number(parts[2])
        const mem = Number(parts[3])
        const command = parts.slice(10).join(' ')
        const name = command.split('/').pop()?.split(' ')[0] || command
        if (!Number.isFinite(cpu) || !Number.isFinite(mem)) return null
        return {
          name: name.slice(0, 30),
          cpu,
          mem,
        }
      })
      .filter(
        (p): p is { name: string; cpu: number; mem: number } => p !== null,
      )
  } catch {
    return []
  }
}

export async function getSystemStats(): Promise<SystemStats> {
  const totalRam = os.totalmem()
  const freeRam = os.freemem()
  const usedRam = Math.max(0, totalRam - freeRam)
  const [cpuUsage, disk] = await Promise.all([
    getCpuUsagePercent(500),
    Promise.resolve(getDiskStats()),
  ])

  const cpus = os.cpus()
  const cpuModel = cpus[0]?.model ?? 'Unknown CPU'
  const cores = cpus.length

  return {
    cpu: cpuUsage,
    ram: { used: usedRam, total: totalRam },
    disk,
    load: os.loadavg().map((v) => Number(v.toFixed(2))) as [
      number,
      number,
      number,
    ],
    uptime: formatUptime(os.uptime()),
    network: getNetworkIo(),
    topProcesses: getTopProcesses(),
    cpuModel,
    cores,
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
    const sessionsData = JSON.parse(sessionsJson) as {
      count?: number
      sessions?: unknown[]
    }
    const activeSessions =
      sessionsData.count ?? sessionsData.sessions?.length ?? 0
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
    const data = JSON.parse(cronJson) as {
      jobs?: Array<Record<string, unknown>>
    }
    const jobs = data.jobs ?? []

    return jobs.map((job) => {
      const schedule = job.schedule as Record<string, unknown> | undefined
      const state = job.state as Record<string, unknown> | undefined

      // Build schedule string
      let scheduleStr = '—'
      if (schedule) {
        if (schedule.expr) scheduleStr = String(schedule.expr)
        else if (schedule.kind === 'every' && schedule.everyMs)
          scheduleStr = `every ${Number(schedule.everyMs) / 1000 / 60}m`
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
        rawStatus === 'ok'
          ? 'ok'
          : rawStatus === 'error'
            ? 'error'
            : rawStatus === 'idle'
              ? 'idle'
              : 'unknown'

      return {
        id: String(job.id ?? ''),
        name: String(job.name ?? job.id ?? 'Unnamed'),
        schedule: scheduleStr,
        enabled: Boolean(job.enabled ?? true),
        nextRun,
        lastRun,
        lastStatus,
      }
    })
  } catch {
    return []
  }
}
