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

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg p-2', hasErrors ? 'bg-red-100' : 'bg-primary-100')}>
          <HugeiconsIcon
            icon={SmartPhone01Icon}
            size={24}
            strokeWidth={1.5}
            className={hasErrors ? 'text-red-600' : 'text-primary-600'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-primary-900">{bot.name}</h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-primary-500">
            <HugeiconsIcon icon={Clock01Icon} size={12} />
            <span>Last active: {formatRelativeMs(lastActivity || undefined)}</span>
          </div>
          <div className="mt-2">
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-600">
              {bot.jobs.length} job{bot.jobs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
