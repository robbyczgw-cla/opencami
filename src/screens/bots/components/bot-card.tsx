import { HugeiconsIcon } from '@hugeicons/react'
import { Clock01Icon, SmartPhone01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import type { CronJob } from '../hooks/use-cron-jobs'

export interface BotGroup {
  name: string
  jobs: CronJob[]
}

function formatRelativeMs(ms?: number): string {
  if (!ms) return 'never'
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ms).toLocaleDateString()
}

function extractBotName(jobName: string): string {
  for (const separator of [' - ', ' | ', ': ', ' / ']) {
    const index = jobName.indexOf(separator)
    if (index > 0) return jobName.substring(0, index).trim()
  }
  return jobName
}

export function groupJobsIntoBots(jobs: CronJob[]): BotGroup[] {
  const grouped = new Map<string, CronJob[]>()

  for (const job of jobs) {
    const name = extractBotName(job.name ?? job.id)
    const existing = grouped.get(name)
    if (existing) {
      existing.push(job)
    } else {
      grouped.set(name, [job])
    }
  }

  return Array.from(grouped.entries())
    .map(([name, groupedJobs]) => ({ name, jobs: groupedJobs }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function BotCard({ bot }: { bot: BotGroup }) {
  const lastActivity = bot.jobs.reduce((max, job) => Math.max(max, job.state?.lastRunAtMs ?? 0), 0)
  const hasErrors = bot.jobs.some((job) => job.state?.lastStatus === 'error')
  const enabledCount = bot.jobs.filter((job) => job.enabled).length

  return (
    <div className="group rounded-lg border border-primary-100 bg-surface p-4 transition-all duration-150 ease-out hover:border-primary-200 hover:shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg',
            hasErrors ? 'bg-red-50' : 'bg-primary-50'
          )}>
            <HugeiconsIcon
              icon={SmartPhone01Icon}
              size={20}
              strokeWidth={1.5}
              className={hasErrors ? 'text-red-500' : 'text-primary-500'}
            />
          </div>
          <h4 className="text-[13px] font-semibold text-primary-900 leading-tight truncate">
            {bot.name}
          </h4>
        </div>
        {hasErrors && (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-50 text-red-600 border border-red-100 shrink-0">
            Error
          </span>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-2 border-t border-primary-50">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-primary-400 flex items-center gap-1">
            <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={1.5} />
            {formatRelativeMs(lastActivity || undefined)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary-50 text-primary-500 border border-primary-100">
            {bot.jobs.length} job{bot.jobs.length !== 1 ? 's' : ''}
          </span>
          {enabledCount < bot.jobs.length && (
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              {bot.jobs.length - enabledCount} disabled
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
