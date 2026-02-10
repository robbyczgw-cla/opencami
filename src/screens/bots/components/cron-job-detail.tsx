import { HugeiconsIcon } from '@hugeicons/react'
import { Clock01Icon, Loading01Icon } from '@hugeicons/core-free-icons'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useCronJobRuns, type CronJob, type CronJobRun } from '../hooks/use-cron-jobs'

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function formatTime(ts?: string): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString()
}

export function CronJobDetail({ job }: { job: CronJob }) {
  const runsQuery = useCronJobRuns(job.id)
  const runs: CronJobRun[] = runsQuery.data ?? []

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden"
    >
      <div className="space-y-3 border-t border-primary-200 bg-primary-50 px-4 py-3">
        {(job.payload.message || job.payload.prompt) && (
          <div>
            <p className="mb-1 text-xs font-medium text-primary-500">Prompt / Message</p>
            <p className="whitespace-pre-wrap break-words rounded bg-primary-100 p-2 text-sm text-primary-800">
              {(job.payload.message ?? job.payload.prompt) as string}
            </p>
          </div>
        )}

        {job.delivery && (
          <div>
            <p className="mb-1 text-xs font-medium text-primary-500">Delivery</p>
            <div className="flex flex-wrap gap-3 text-sm text-primary-700">
              {job.delivery.mode && (
                <span>
                  Mode: <strong>{job.delivery.mode}</strong>
                </span>
              )}
              {job.delivery.channel && (
                <span>
                  Channel: <strong>{job.delivery.channel}</strong>
                </span>
              )}
              {job.delivery.to && (
                <span>
                  To: <strong>{job.delivery.to}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {job.payload.model && (
          <div>
            <p className="mb-1 text-xs font-medium text-primary-500">Model</p>
            <p className="text-xs text-primary-700 font-mono">{job.payload.model}</p>
          </div>
        )}

        {job.state?.lastError && (
          <div>
            <p className="mb-1 text-xs font-medium text-red-500">Last Error</p>
            <p className="rounded bg-red-50 p-2 font-mono text-xs text-red-700">
              {job.state.lastError}
            </p>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-medium text-primary-500">Recent Runs</p>
          {runsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-primary-500">
              <HugeiconsIcon icon={Loading01Icon} size={14} className="animate-spin" />
              Loading...
            </div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-primary-400">No run history available</p>
          ) : (
            <div className="space-y-1">
              {runs.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center gap-3 py-1 text-sm">
                  <span
                    className={cn(
                      'inline-block h-2 w-2 shrink-0 rounded-full',
                      run.status === 'ok' ? 'bg-green-500' : 'bg-red-500',
                    )}
                  />
                  <HugeiconsIcon icon={Clock01Icon} size={12} className="text-primary-500" />
                  <span className="tabular-nums text-xs text-primary-600">{formatTime(run.ranAt)}</span>
                  <span className="tabular-nums text-xs text-primary-500">{formatDuration(run.durationMs)}</span>
                  {run.error && <span className="truncate text-xs text-red-500">{run.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
