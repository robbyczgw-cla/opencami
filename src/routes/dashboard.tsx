import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

type SystemStats = {
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

type GatewayStats = {
  activeSessions: number
  tokensToday: number
  costToday: number
}

type CronJob = {
  id: string
  name: string
  schedule: string
  enabled: boolean
  nextRun: string | null
  lastRun: string | null
  lastStatus: 'ok' | 'error' | 'idle' | 'unknown'
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

function formatGb(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function formatCompact(num: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num)
}

function formatCost(num: number): string {
  return `$${num.toFixed(3)}`
}

function formatWhen(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

function usageColor(percent: number): string {
  if (percent < 60) return '#10b981'
  if (percent <= 80) return '#f59e0b'
  return '#ef4444'
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="h-2 w-full rounded-full bg-primary-200 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${clamped}%`, backgroundColor: usageColor(clamped) }}
      />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-primary-200 bg-primary-100 p-4 animate-pulse space-y-3">
      <div className="h-4 w-32 bg-primary-200 rounded" />
      <div className="h-10 bg-primary-200 rounded" />
      <div className="h-10 bg-primary-200 rounded" />
      <div className="h-10 bg-primary-200 rounded" />
    </div>
  )
}

export const Route = createFileRoute('/dashboard')({
  component: DashboardRoute,
})

function DashboardRoute() {
  const systemQuery = useQuery({
    queryKey: ['dashboard', 'system'],
    queryFn: () => fetchJson<SystemStats>('/api/dashboard/system'),
    refetchInterval: 10_000,
  })

  const gatewayQuery = useQuery({
    queryKey: ['dashboard', 'gateway'],
    queryFn: () => fetchJson<GatewayStats>('/api/dashboard/gateway'),
    refetchInterval: 10_000,
  })

  const cronQuery = useQuery({
    queryKey: ['dashboard', 'crons'],
    queryFn: async () => {
      const data = await fetchJson<{ jobs: Array<CronJob> }>(
        '/api/dashboard/crons',
      )
      return data.jobs
    },
    refetchInterval: 10_000,
  })

  const hasError =
    systemQuery.isError || gatewayQuery.isError || cronQuery.isError

  const cpuUsage = systemQuery.data?.cpu ?? 0
  const ramPercent =
    (systemQuery.data?.ram.total ?? 0) > 0
      ? ((systemQuery.data?.ram.used ?? 0) /
          (systemQuery.data?.ram.total ?? 1)) *
        100
      : 0
  const diskPercent =
    (systemQuery.data?.disk.total ?? 0) > 0
      ? ((systemQuery.data?.disk.used ?? 0) /
          (systemQuery.data?.disk.total ?? 1)) *
        100
      : 0

  return (
    <div className="flex h-screen flex-col bg-surface text-primary-900">
      <div className="px-4 pt-4 pb-3 border-b border-primary-100">
        <h2 className="text-base font-semibold text-primary-900">Dashboard</h2>
        <p className="text-xs text-primary-500">
          Live system and gateway overview (refreshes every 10s)
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {hasError && (
          <div className="mb-4 rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            Failed to load one or more widgets. Retrying automatically…
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {systemQuery.isLoading ? (
            <CardSkeleton />
          ) : (
            <div className="rounded-xl border border-primary-200 bg-primary-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">💻 System Stats</h3>
                <span className="text-xs text-primary-500">↻ auto-refresh</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-primary-500">
                  <span>CPU</span>
                  <span>
                    {cpuUsage.toFixed(1)}% · {systemQuery.data?.cores ?? 0}{' '}
                    cores
                  </span>
                </div>
                <ProgressBar percent={cpuUsage} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-primary-500">
                  <span>RAM</span>
                  <span>
                    {formatGb(systemQuery.data?.ram.used ?? 0)} /{' '}
                    {formatGb(systemQuery.data?.ram.total ?? 0)}
                  </span>
                </div>
                <ProgressBar percent={ramPercent} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-primary-500">
                  <span>Disk</span>
                  <span>
                    {formatGb(systemQuery.data?.disk.used ?? 0)} /{' '}
                    {formatGb(systemQuery.data?.disk.total ?? 0)}
                  </span>
                </div>
                <ProgressBar percent={diskPercent} />
              </div>

              <div className="border-t border-primary-200 pt-3 space-y-1.5 text-xs text-primary-500">
                <div className="flex items-center justify-between gap-2">
                  <span>Load (1m/5m/15m)</span>
                  <span>
                    {(systemQuery.data?.load?.[0] ?? 0).toFixed(2)} ·{' '}
                    {(systemQuery.data?.load?.[1] ?? 0).toFixed(2)} ·{' '}
                    {(systemQuery.data?.load?.[2] ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Uptime</span>
                  <span>{systemQuery.data?.uptime ?? '0m'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Net ↓ / ↑</span>
                  <span>
                    {systemQuery.data?.network.rx ?? '0 MB'} /{' '}
                    {systemQuery.data?.network.tx ?? '0 MB'}
                  </span>
                </div>
                <div
                  className="truncate"
                  title={systemQuery.data?.cpuModel ?? ''}
                >
                  CPU: {systemQuery.data?.cpuModel ?? 'Unknown CPU'}
                </div>
              </div>

              <div className="border-t border-primary-200 pt-3">
                <div className="text-xs font-semibold text-primary-700 mb-2">
                  Top Processes
                </div>
                <div className="space-y-1 text-xs">
                  {(systemQuery.data?.topProcesses ?? []).map((proc, idx) => (
                    <div
                      key={`${proc.name}-${idx}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate text-primary-700">
                        {proc.name}
                      </span>
                      <span className="text-primary-500 shrink-0">
                        {proc.cpu.toFixed(1)}% CPU · {proc.mem.toFixed(1)}% MEM
                      </span>
                    </div>
                  ))}
                  {(systemQuery.data?.topProcesses.length ?? 0) === 0 && (
                    <div className="text-primary-500">No process data.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {gatewayQuery.isLoading ? (
            <CardSkeleton />
          ) : (
            <div className="rounded-xl border border-primary-200 bg-primary-100 p-4 space-y-4">
              <h3 className="text-sm font-semibold">Gateway Status</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-primary-500">Active sessions</span>
                  <span>{gatewayQuery.data?.activeSessions ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-500">Tokens today</span>
                  <span>
                    {formatCompact(gatewayQuery.data?.tokensToday ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-500">Estimated cost</span>
                  <span>{formatCost(gatewayQuery.data?.costToday ?? 0)}</span>
                </div>
              </div>
            </div>
          )}

          {cronQuery.isLoading ? (
            <CardSkeleton />
          ) : (
            <div className="rounded-xl border border-primary-200 bg-primary-100 p-4 flex flex-col min-h-[340px] max-h-[70vh]">
              <h3 className="text-sm font-semibold mb-3">
                🕐 Cron Jobs ({cronQuery.data?.length ?? 0})
              </h3>
              <div className="space-y-2 overflow-auto pr-1">
                {(cronQuery.data ?? []).map((job) => (
                  <div
                    key={job.id}
                    className={`rounded-md border border-primary-200 px-2.5 py-2 ${
                      job.enabled ? 'opacity-100' : 'opacity-50 grayscale'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm truncate">{job.name}</div>
                      <div className="text-xs">
                        {!job.enabled
                          ? '⏸️'
                          : job.lastStatus === 'ok'
                            ? '✅'
                            : job.lastStatus === 'error'
                              ? '❌'
                              : '—'}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-primary-500">
                      Next: {formatWhen(job.nextRun)}
                    </div>
                  </div>
                ))}
                {(cronQuery.data?.length ?? 0) === 0 && (
                  <div className="text-xs text-primary-500">
                    No cron jobs found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
