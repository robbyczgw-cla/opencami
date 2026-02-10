import { HugeiconsIcon } from '@hugeicons/react'
import { Clock01Icon, Loading02Icon } from '@hugeicons/core-free-icons'
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
      <div className="space-y-4 border-t border-primary-100 bg-primary-50/50 px-4 py-4">
        {(job.payload.message || job.payload.prompt) && (
          <div>
            <h5 className="text-xs font-medium text-primary-400 uppercase tracking-wider mb-2">Prompt / Message</h5>
            <p className="whitespace-pre-wrap break-words rounded-lg bg-surface border border-primary-100 p-3 text-sm text-primary-700 leading-relaxed">
              {(job.payload.message ?? job.payload.prompt) as string}
            </p>
          </div>
        )}

        {job.delivery && (
          <div>
            <h5 className="text-xs font-medium text-primary-400 uppercase tracking-wider mb-2">Delivery</h5>
            <div className="flex flex-wrap gap-2">
              {job.delivery.mode && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-surface text-primary-600 border border-primary-100">
                  Mode: {job.delivery.mode}
                </span>
              )}
              {job.delivery.channel && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-surface text-primary-600 border border-primary-100">
                  Channel: {job.delivery.channel}
                </span>
              )}
              {job.delivery.to && (
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-surface text-primary-600 border border-primary-100">
                  To: {job.delivery.to}
                </span>
              )}
            </div>
          </div>
        )}

        {job.payload.model && (
          <div>
            <h5 className="text-xs font-medium text-primary-400 uppercase tracking-wider mb-2">Model</h5>
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono rounded-full bg-surface text-primary-600 border border-primary-100">
              {job.payload.model}
            </span>
          </div>
        )}

        {job.state?.lastError && (
          <div>
            <h5 className="text-xs font-medium text-red-500 uppercase tracking-wider mb-2">Last Error</h5>
            <p className="rounded-lg bg-red-50 border border-red-100 p-3 font-mono text-xs text-red-600 leading-relaxed">
              {job.state.lastError}
            </p>
          </div>
        )}

        <div>
          <h5 className="text-xs font-medium text-primary-400 uppercase tracking-wider mb-2">Recent Runs</h5>
          {runsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-xs text-primary-500">
              <HugeiconsIcon icon={Loading02Icon} size={12} className="animate-spin" />
              Loading...
            </div>
          ) : runs.length === 0 ? (
            <p className="text-xs text-primary-400">No run history available</p>
          ) : (
            <div className="space-y-1.5">
              {runs.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center gap-3 py-1.5 px-2 rounded-md bg-surface border border-primary-50">
                  <span
                    className={cn(
                      'inline-block h-2 w-2 shrink-0 rounded-full',
                      run.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500',
                    )}
                  />
                  <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={1.5} className="text-primary-400" />
                  <span className="tabular-nums text-[11px] text-primary-600">{formatTime(run.ranAt)}</span>
                  <span className="tabular-nums text-[11px] text-primary-400">{formatDuration(run.durationMs)}</span>
                  {run.error && <span className="truncate text-[11px] text-red-500 ml-auto">{run.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
