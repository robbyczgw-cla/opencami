import { cn } from '@/lib/utils'

const DATE_RE = /\/(\d{4}-\d{2}-\d{2})/

type MemorySidebarProps = {
  files: string[]
  selectedPath: string | null
  onSelect: (path: string) => void
  loading?: boolean
}

function FileButton({
  path,
  label,
  selected,
  onSelect,
}: {
  path: string
  label: string
  selected: boolean
  onSelect: (path: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(path)}
      className={cn(
        'w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors',
        selected
          ? 'text-primary-900'
          : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50',
      )}
      style={selected ? { backgroundColor: 'var(--opencami-accent-light)' } : undefined}
    >
      {label}
    </button>
  )
}

function formatLabel(path: string): string {
  if (path === '/MEMORY.md') return '📋 MEMORY.md'
  const dateMatch = path.match(DATE_RE)
  if (dateMatch) {
    const name = path.replace(/^\/?memory\//, '')
    return `📅 ${name}`
  }
  return `📄 ${path.replace(/^\/?memory\//, '')}`
}

export function MemorySidebar({ files, selectedPath, onSelect, loading }: MemorySidebarProps) {
  const memoryMd = files.filter((p) => p === '/MEMORY.md')
  const daily = files.filter((p) => p !== '/MEMORY.md' && DATE_RE.test(p))
  const other = files.filter((p) => p !== '/MEMORY.md' && !DATE_RE.test(p))

  return (
    <aside className="border-r border-primary-200 bg-primary-100 md:w-72 w-full md:h-full h-auto overflow-y-auto">
      <div className="px-4 py-3 border-b border-primary-200">
        <h2 className="text-sm font-semibold text-primary-800">Memory Files</h2>
      </div>
      <div className="p-2 space-y-0.5">
        {loading ? (
          <div className="px-2 py-2 text-sm text-primary-500">Loading files…</div>
        ) : files.length === 0 ? (
          <div className="px-2 py-2 text-sm text-primary-500">No memory files found.</div>
        ) : (
          <>
            {memoryMd.map((p) => (
              <FileButton key={p} path={p} label={formatLabel(p)} selected={selectedPath === p} onSelect={onSelect} />
            ))}

            {daily.length > 0 && (
              <>
                <div className="px-2.5 pt-3 pb-1 text-xs font-medium text-primary-400 uppercase tracking-wider">Daily</div>
                {daily.map((p) => (
                  <FileButton key={p} path={p} label={formatLabel(p)} selected={selectedPath === p} onSelect={onSelect} />
                ))}
              </>
            )}

            {other.length > 0 && (
              <>
                <div className="px-2.5 pt-3 pb-1 text-xs font-medium text-primary-400 uppercase tracking-wider">Notes</div>
                {other.map((p) => (
                  <FileButton key={p} path={p} label={formatLabel(p)} selected={selectedPath === p} onSelect={onSelect} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
