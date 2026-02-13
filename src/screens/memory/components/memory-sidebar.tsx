import { cn } from '@/lib/utils'

type MemorySidebarProps = {
  files: string[]
  selectedPath: string | null
  onSelect: (path: string) => void
  loading?: boolean
}

export function MemorySidebar({ files, selectedPath, onSelect, loading }: MemorySidebarProps) {
  return (
    <aside className="border-r border-primary-200 bg-primary-100 md:w-72 w-full md:h-full h-auto">
      <div className="px-4 py-3 border-b border-primary-200">
        <h2 className="text-sm font-semibold text-primary-800">Memory Files</h2>
      </div>
      <div className="p-2 space-y-1">
        {loading ? (
          <div className="px-2 py-2 text-sm text-primary-500">Loading files…</div>
        ) : files.length === 0 ? (
          <div className="px-2 py-2 text-sm text-primary-500">No memory files found.</div>
        ) : (
          files.map((path) => (
            <button
              key={path}
              type="button"
              onClick={() => onSelect(path)}
              className={cn(
                'w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors',
                selectedPath === path
                  ? 'text-primary-900'
                  : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50',
              )}
              style={selectedPath === path ? { backgroundColor: 'var(--opencami-accent-light)' } : undefined}
            >
              {path === 'MEMORY.md' ? 'MEMORY.md' : path.replace('memory/', '')}
            </button>
          ))
        )}
      </div>
    </aside>
  )
}
