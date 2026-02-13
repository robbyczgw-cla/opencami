import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { MemorySidebar } from './components/memory-sidebar'
import { MemoryEditor } from './components/memory-editor'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type FilesListResponse = {
  items: Array<{ path: string; name: string; isDir: boolean }>
}

type ReadResponse = {
  content: string
}

function sortMemoryFiles(paths: string[]) {
  const memoryMd = paths.includes('MEMORY.md') ? ['MEMORY.md'] : []
  const daily = paths
    .filter((path) => path.startsWith('memory/') && path.endsWith('.md'))
    .sort((a, b) => b.localeCompare(a))
  return [...memoryMd, ...daily]
}

export function MemoryScreen() {
  const queryClient = useQueryClient()
  const [selectedPath, setSelectedPath] = useState<string | null>('MEMORY.md')

  const filesQuery = useQuery({
    queryKey: ['memory', 'files'],
    queryFn: async ({ signal }): Promise<string[]> => {
      const [memoryRootRes, dailyRes] = await Promise.all([
        fetch('/api/files/read?path=MEMORY.md', { signal }),
        fetch('/api/files/list?path=memory', { signal }),
      ])

      const paths: string[] = []
      if (memoryRootRes.ok) paths.push('MEMORY.md')

      if (dailyRes.ok) {
        const daily = (await dailyRes.json()) as FilesListResponse
        for (const item of daily.items) {
          if (!item.isDir && item.path.endsWith('.md')) {
            paths.push(item.path)
          }
        }
      }

      return sortMemoryFiles(paths)
    },
    staleTime: 30_000,
  })

  const selectedFile = selectedPath ?? filesQuery.data?.[0] ?? null

  const contentQuery = useQuery({
    queryKey: ['memory', 'content', selectedFile],
    queryFn: async ({ signal }): Promise<ReadResponse> => {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(selectedFile!)}`, { signal })
      if (!res.ok) throw new Error('Failed to read memory file')
      return res.json()
    },
    enabled: !!selectedFile,
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: { path: string; content: string }) => {
      const res = await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save memory file')
      return res.json()
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['memory', 'content', variables.path] })
      await queryClient.invalidateQueries({ queryKey: ['memory', 'files'] })
    },
  })

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const showSidebarOnMobile = isMobile && !selectedFile

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path)
  }, [])

  return (
    <div className="h-screen bg-surface text-primary-900">
      <div className="h-12 border-b border-primary-100 px-3 flex items-center justify-between">
        <h1 className="text-sm font-semibold">Memory Viewer</h1>
        <Link
          to="/chat/$sessionKey"
          params={{ sessionKey: 'main' }}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          Back to Chat
        </Link>
      </div>

      <div className="h-[calc(100vh-48px)] md:grid md:grid-cols-[18rem_1fr]">
        {(!isMobile || showSidebarOnMobile) && (
          <MemorySidebar
            files={filesQuery.data ?? []}
            selectedPath={selectedFile}
            onSelect={handleSelect}
            loading={filesQuery.isLoading}
          />
        )}

        {selectedFile && (!isMobile || !showSidebarOnMobile) ? (
          <MemoryEditor
            filePath={selectedFile}
            content={contentQuery.data?.content ?? ''}
            isLoading={contentQuery.isLoading}
            onBack={isMobile ? () => setSelectedPath(null) : undefined}
            onSave={async (content) => {
              await saveMutation.mutateAsync({ path: selectedFile, content })
            }}
          />
        ) : (
          <div className="p-4 text-sm text-primary-500">Select a file to view.</div>
        )}
      </div>

      {(filesQuery.isError || contentQuery.isError || saveMutation.isError) && (
        <div className="fixed bottom-4 right-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Something went wrong. <Button size="sm" variant="ghost" onClick={() => void filesQuery.refetch()}>Retry</Button>
        </div>
      )}
    </div>
  )
}
