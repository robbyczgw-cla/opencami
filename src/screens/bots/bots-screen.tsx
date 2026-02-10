// Cron Jobs Panel — inspired by balin-ar/webclaw's implementation
// https://github.com/balin-ar/webclaw

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  Clock01Icon,
  Loading01Icon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CronJobTable } from './components/cron-job-table'
import { BotCard, groupJobsIntoBots } from './components/bot-card'
import { useCronJobs } from './hooks/use-cron-jobs'

export function BotsScreen() {
  const cronJobsQuery = useCronJobs()
  const jobs = cronJobsQuery.data ?? []
  const bots = useMemo(() => groupJobsIntoBots(jobs), [jobs])

  return (
    <div className="flex h-screen flex-col bg-surface text-primary-900">
      <header className="border-b border-primary-200 bg-primary-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/new" className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.5} />
          </Link>
          <HugeiconsIcon icon={SmartPhone01Icon} size={24} strokeWidth={1.5} className="text-primary-600" />
          <h1 className="text-lg font-semibold text-primary-900">Cron Jobs</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {cronJobsQuery.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <HugeiconsIcon icon={Loading01Icon} size={24} className="animate-spin text-primary-400" />
          </div>
        ) : cronJobsQuery.isError ? (
          <div className="p-6 text-center">
            <p className="text-sm text-red-600">
              {cronJobsQuery.error instanceof Error ? cronJobsQuery.error.message : 'Failed to load cron jobs'}
            </p>
            <button
              onClick={() => void cronJobsQuery.refetch()}
              className="mt-2 text-sm text-primary-600 underline hover:text-primary-900"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-6 p-6">
            {bots.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-500">
                  <HugeiconsIcon icon={SmartPhone01Icon} size={16} />
                  Bots ({bots.length})
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {bots.map((bot) => (
                    <BotCard key={bot.name} bot={bot} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-primary-500">
                <HugeiconsIcon icon={Clock01Icon} size={16} />
                All Cron Jobs ({jobs.length})
              </h2>
              <div className="overflow-hidden rounded-lg border border-primary-200 bg-white">
                <CronJobTable jobs={jobs} />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
