import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type CronSchedule = {
  kind: 'cron' | 'at' | 'every'
  expr?: string
  tz?: string
}

export type CronPayload = {
  kind?: string
  message?: string
  prompt?: string
  model?: string
  [key: string]: unknown
}

export type CronDelivery = {
  mode?: string
  channel?: string
  to?: string
  [key: string]: unknown
}

export type CronState = {
  nextRunAtMs?: number
  lastRunAtMs?: number
  lastStatus?: 'ok' | 'error'
  lastDurationMs?: number
  lastError?: string
  consecutiveErrors?: number
}

export type CronJob = {
  id: string
  name?: string
  enabled: boolean
  schedule: CronSchedule
  payload: CronPayload
  delivery?: CronDelivery
  state?: CronState
}

export type CronJobRun = {
  id: string
  jobId: string
  status: 'ok' | 'error'
  durationMs?: number
  error?: string
  ranAt?: string
}

type CronJobsResponse = {
  jobs: CronJob[]
}

type CronRunsResponse = {
  runs: CronJobRun[]
}

const CRON_JOBS_KEY = ['cron-jobs'] as const

export function useCronJobs() {
  return useQuery({
    queryKey: CRON_JOBS_KEY,
    queryFn: async ({ signal }): Promise<CronJob[]> => {
      const controller = new AbortController()
      const onAbort = () => controller.abort()
      signal.addEventListener('abort', onAbort)
      try {
        const res = await fetch('/api/cron', { signal: controller.signal })
        if (!res.ok) throw new Error('Failed to fetch cron jobs')
        const data = (await res.json()) as CronJobsResponse
        return Array.isArray(data.jobs) ? data.jobs : []
      } finally {
        signal.removeEventListener('abort', onAbort)
      }
    },
    refetchInterval: 30_000,
  })
}

export function useCronJobRuns(jobId: string | null) {
  return useQuery({
    queryKey: ['cron-job-runs', jobId],
    queryFn: async ({ signal }): Promise<CronJobRun[]> => {
      if (!jobId) return []
      const controller = new AbortController()
      const onAbort = () => controller.abort()
      signal.addEventListener('abort', onAbort)
      try {
        const res = await fetch(`/api/cron?jobId=${encodeURIComponent(jobId)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch cron job runs')
        const data = (await res.json()) as CronRunsResponse
        return Array.isArray(data.runs) ? data.runs : []
      } finally {
        signal.removeEventListener('abort', onAbort)
      }
    },
    enabled: !!jobId,
  })
}

export function useRunCronJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const controller = new AbortController()
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('Failed to run cron job')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CRON_JOBS_KEY })
    },
  })
}

export function useToggleCronJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, enabled }: { jobId: string; enabled: boolean }) => {
      const controller = new AbortController()
      const res = await fetch('/api/cron', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, patch: { enabled } }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('Failed to update cron job')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CRON_JOBS_KEY })
    },
  })
}
