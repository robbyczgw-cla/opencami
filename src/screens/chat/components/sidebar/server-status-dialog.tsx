import { Loading02Icon, RefreshIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'

type ServerStatusDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type StatusResponse = {
  output?: string
  timestamp?: string
}

async function fetchServerStatus(): Promise<StatusResponse> {
  const res = await fetch('/api/status')
  const data = (await res.json()) as StatusResponse
  if (!res.ok) {
    return {
      output: data.output || 'Failed to load server status',
      timestamp: data.timestamp,
    }
  }
  return data
}

export function ServerStatusDialog({ open, onOpenChange }: ServerStatusDialogProps) {
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [timestamp, setTimestamp] = useState('')

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchServerStatus()
      setOutput(data.output || 'No output from server status command')
      setTimestamp(data.timestamp || new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      void loadStatus()
    }
  }, [open, loadStatus])

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(720px,94vw)]">
        <div className="p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-base">Server Status</DialogTitle>
              <DialogDescription className="text-xs">
                Live output from <span className="font-mono">openclaw status</span>
              </DialogDescription>
            </div>
            <Button size="sm" variant="outline" onClick={loadStatus} disabled={loading}>
              {loading ? (
                <HugeiconsIcon icon={Loading02Icon} size={14} className="animate-spin" />
              ) : (
                <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.5} />
              )}
              <span className="ml-1">Refresh</span>
            </Button>
          </div>

          <div className="rounded-md border border-primary-100 bg-primary-950/95 p-3">
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-primary-100">
              {output || 'Loading status...'}
            </pre>
          </div>

          {timestamp && (
            <div className="mt-2 text-[11px] text-primary-500">
              Last updated: {new Date(timestamp).toLocaleString()}
            </div>
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
