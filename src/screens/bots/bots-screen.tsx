// Cron Jobs Panel — inspired by balin-ar/webclaw's implementation
// https://github.com/balin-ar/webclaw

import { useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  Clock01Icon,
  Loading02Icon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons'
import { Link } from '@tanstack/react-router'
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
      {/* Header with back button — consistent with Skills Browser */}
      <div className="px-4 pt-4 pb-3 border-b border-primary-100">
        <div className="flex items-center gap-3 mb-2">
          <Link
            to="/chat/$sessionKey"
            params={{ sessionKey: 'main' }}
            className="p-1.5 -ml-1.5 rounded-md text-primary-500 hover:text-primary-700 hover:bg-primary-50 transition-colors duration-150"
            aria-label="Back to Chat"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} />
          </Link>
          <h2 className="text-base font-semibold text-primary-900">Cron Jobs</h2>
        </div>
        <p className="text-xs text-primary-500">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} configured
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 pt-4">
        {cronJobsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <HugeiconsIcon icon={Loading02Icon} size={18} className="animate-spin text-primary-300" />
          </div>
        ) : cronJobsQuery.isError ? (
          <div className="py-12 text-center">
            <p className="text-sm text-red-500">
              {cronJobsQuery.error instanceof Error ? cronJobsQuery.error.message : 'Failed to load cron jobs'}
            </p>
            <button
              onClick={() => void cronJobsQuery.refetch()}
              className="mt-2 text-xs font-medium text-primary-500 hover:text-primary-700 transition-colors duration-150"
            >
              Retry
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-50 mb-3">
              <HugeiconsIcon icon={Clock01Icon} size={24} className="text-primary-400" />
            </div>
            <p className="text-sm text-primary-500">No cron jobs configured</p>
            <p className="text-xs text-primary-400 mt-1">Jobs will appear here once created</p>
          </div>
        ) : (
          <div className="space-y-6">
            {bots.length > 0 && (
              <section>
                <h3 className="text-xs font-medium text-primary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <HugeiconsIcon icon={SmartPhone01Icon} size={14} strokeWidth={1.5} />
                  Bots ({bots.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {bots.map((bot) => (
                    <BotCard key={bot.name} bot={bot} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-xs font-medium text-primary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <HugeiconsIcon icon={Clock01Icon} size={14} strokeWidth={1.5} />
                All Jobs ({jobs.length})
              </h3>
              <div className="space-y-2">
                <CronJobTable jobs={jobs} />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
