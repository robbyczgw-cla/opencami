import { useCallback, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlayIcon, Loading01Icon } from '@hugeicons/core-free-icons'
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
    return <div className="py-8 text-center text-sm text-primary-500">No cron jobs configured</div>
  }

  return (
    <div className="divide-y divide-primary-200">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 bg-primary-50 px-4 py-2 text-xs font-medium text-primary-500">
        <div>Name</div>
        <div className="w-44">Schedule</div>
        <div className="w-20 text-center">Last Run</div>
        <div className="w-16 text-center">Status</div>
        <div className="w-20 text-center">Next Run</div>
        <div className="w-24 text-right">Actions</div>
      </div>

      {jobs.map((job) => {
        const isExpanded = expandedId === job.id
        const isRunning = runMutation.isPending && runMutation.variables === job.id

        return (
          <div key={job.id}>
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : job.id)}
              className={cn(
                'grid w-full grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-4 py-3 text-left text-sm',
                'transition-colors duration-100 hover:bg-primary-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                isExpanded && 'bg-primary-100',
              )}
            >
              <div className="min-w-0">
                <span className={cn('block truncate font-medium', !job.enabled && 'text-primary-400')}>
                  {job.name ?? job.id}
                </span>
              </div>
              <div className="w-44 truncate text-primary-600">{humanSchedule(job)}</div>
              <div className="w-20 text-center tabular-nums text-primary-500">
                {formatRelativeMs(job.state?.lastRunAtMs)}
              </div>
              <div className="flex w-16 justify-center">
                {job.state?.lastStatus === 'ok' && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                    ok
                  </span>
                )}
                {job.state?.lastStatus === 'error' && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                    error
                  </span>
                )}
                {!job.state?.lastStatus && (
                  <span className="inline-flex items-center rounded-full bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-400">
                    —
                  </span>
                )}
              </div>
              <div className="w-20 text-center tabular-nums text-primary-500">
                {formatFutureMs(job.state?.nextRunAtMs)}
              </div>
              <div
                className="flex w-24 items-center justify-end gap-2"
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
                >
                  <HugeiconsIcon
                    icon={isRunning ? Loading01Icon : PlayIcon}
                    size={16}
                    className={cn(isRunning && 'animate-spin')}
                  />
                </Button>
              </div>
            </button>

            <AnimatePresence>{isExpanded && <CronJobDetail job={job} />}</AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
