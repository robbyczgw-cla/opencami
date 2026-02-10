import { useCallback, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlayIcon, Loading02Icon, Clock01Icon, Calendar01Icon } from '@hugeicons/core-free-icons'
import { AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useRunCronJob, useToggleCronJob, type CronJob } from '../hooks/use-cron-jobs'
import { CronJobDetail } from './cron-job-detail'

function parseCronExpr(expr: string): string {
  const parts = expr.trim().split(/\s+/)
  if (parts.length < 5) return expr

  const [min, hour, dom, mon, dow] = parts
  const timeStr = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`

  if (dom === '*' && mon === '*' && dow === '*') return `Daily at ${timeStr}`
  if (dom === '*' && mon === '*' && dow !== '*') {
    const days: Record<string, string> = {
      '0': 'Sun',
      '1': 'Mon',
      '2': 'Tue',
      '3': 'Wed',
      '4': 'Thu',
      '5': 'Fri',
      '6': 'Sat',
      '7': 'Sun',
    }
    const dayNames = dow
      .split(',')
      .map((d) => days[d] ?? d)
      .join(', ')
    return `${dayNames} at ${timeStr}`
  }

  return expr
}

function humanSchedule(job: CronJob): string {
  const schedule = job.schedule
  if (schedule.kind === 'every' && schedule.expr) return `Every ${schedule.expr}`
  if (schedule.kind === 'at' && schedule.expr) return `Once at ${schedule.expr}`
  if (schedule.kind === 'cron' && schedule.expr) return parseCronExpr(schedule.expr)
  return schedule.expr ?? 'Unknown'
}

function formatRelativeMs(ms?: number): string {
  if (!ms) return '—'
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ms).toLocaleDateString()
}

function formatFutureMs(ms?: number): string {
  if (!ms) return '—'
  const diff = ms - Date.now()
  if (diff < 0) return 'overdue'
  if (diff < 60_000) return 'in <1m'
  if (diff < 3_600_000) return `in ${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `in ${Math.floor(diff / 3_600_000)}h`
  return new Date(ms).toLocaleDateString()
}

function StatusBadge({ status }: { status?: 'ok' | 'error' | null }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
        ok
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-50 text-red-600 border border-red-100">
        error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-primary-50 text-primary-400 border border-primary-100">
      —
    </span>
  )
}

export function CronJobTable({ jobs }: { jobs: CronJob[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const runMutation = useRunCronJob()
  const toggleMutation = useToggleCronJob()

  const handleToggle = useCallback(
    (job: CronJob) => {
      toggleMutation.mutate({ jobId: job.id, enabled: !job.enabled })
    },
    [toggleMutation],
  )

  const handleRun = useCallback(
    (jobId: string) => {
      runMutation.mutate(jobId)
    },
    [runMutation],
  )

  if (jobs.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const isExpanded = expandedId === job.id
        const isRunning = runMutation.isPending && runMutation.variables === job.id

        return (
          <div
            key={job.id}
            className={cn(
              'group rounded-lg border border-primary-100 bg-surface transition-all duration-150 ease-out',
              isExpanded ? 'border-primary-200 shadow-sm' : 'hover:border-primary-200 hover:shadow-sm',
            )}
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : job.id)}
              className={cn(
                'w-full p-4 text-left',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:rounded-lg',
              )}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className={cn(
                  'text-[13px] font-semibold leading-tight truncate',
                  job.enabled ? 'text-primary-900' : 'text-primary-400'
                )}>
                  {job.name ?? job.id}
                </h4>
                <div className="flex items-center gap-2 shrink-0">
                  {!job.enabled && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-primary-50 text-primary-400 border border-primary-100">
                      Disabled
                    </span>
                  )}
                  <StatusBadge status={job.state?.lastStatus} />
                </div>
              </div>

              {/* Schedule info */}
              <p className="text-xs text-primary-500 leading-relaxed mb-3">
                {humanSchedule(job)}
              </p>

              {/* Footer row */}
              <div className="flex items-center justify-between pt-2 border-t border-primary-50">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-primary-400 flex items-center gap-1">
                    <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={1.5} />
                    Last: {formatRelativeMs(job.state?.lastRunAtMs)}
                  </span>
                  <span className="text-[11px] text-primary-400 flex items-center gap-1">
                    <HugeiconsIcon icon={Calendar01Icon} size={11} strokeWidth={1.5} />
                    Next: {formatFutureMs(job.state?.nextRunAtMs)}
                  </span>
                </div>

                <div
                  className="flex items-center gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Switch
                    checked={job.enabled}
                    onCheckedChange={() => handleToggle(job)}
                    aria-label={`${job.enabled ? 'Disable' : 'Enable'} ${job.name ?? job.id}`}
                    disabled={toggleMutation.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRun(job.id)}
                    disabled={isRunning}
                    aria-label={`Run ${job.name ?? job.id} now`}
                    className="text-primary-500 hover:text-primary-700"
                  >
                    <HugeiconsIcon
                      icon={isRunning ? Loading02Icon : PlayIcon}
                      size={16}
                      strokeWidth={1.5}
                      className={cn(isRunning && 'animate-spin')}
                    />
                  </Button>
                </div>
              </div>
            </button>

            <AnimatePresence>{isExpanded && <CronJobDetail job={job} />}</AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
