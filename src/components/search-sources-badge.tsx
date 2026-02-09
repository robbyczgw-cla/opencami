import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

export type SearchSource = {
  title: string
  url: string
  snippet?: string
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function FaviconCircle({ domain }: { domain: string }) {
  return (
    <div
      className="flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-zinc-800 border border-cyan-500/20 overflow-hidden"
      title={domain}
    >
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        alt=""
        className="w-4 h-4 object-contain"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.textContent = domain.charAt(0).toUpperCase()
            parent.classList.add('text-[10px]', 'font-medium', 'text-cyan-400')
          }
        }}
      />
    </div>
  )
}

export function SearchSourcesBadge({ sources }: { sources: SearchSource[] }) {
  const [expanded, setExpanded] = useState(false)

  if (!sources.length) return null

  const uniqueDomains = [...new Set(sources.map((s) => getDomain(s.url)))]

  return (
    <div className="mt-2 w-full">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
          'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30',
          'text-cyan-300 transition-colors',
        )}
      >
        <HugeiconsIcon icon={Search01Icon} size={14} />
        <span className="font-medium">Sources</span>
        <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold">
          {sources.length}
        </span>
        <div className="flex items-center gap-0.5 ml-1">
          {uniqueDomains.slice(0, 3).map((domain) => (
            <FaviconCircle key={domain} domain={domain} />
          ))}
          {uniqueDomains.length > 3 && (
            <span className="text-cyan-500/70 text-[10px] ml-0.5">
              +{uniqueDomains.length - 3}
            </span>
          )}
        </div>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={12}
          className={cn('transition-transform', expanded && 'rotate-90')}
        />
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 max-h-80 overflow-y-auto">
          {sources.map((source, i) => {
            const domain = getDomain(source.url)
            return (
              <a
                key={`${source.url}-${i}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2.5 border-b border-cyan-500/10 last:border-b-0 hover:bg-cyan-500/5 transition-colors"
              >
                <FaviconCircle domain={domain} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-primary-900 hover:underline line-clamp-1">
                    {source.title || domain}
                  </div>
                  <div className="text-xs text-muted-foreground">{domain}</div>
                  {source.snippet && (
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-0.5">
                      {source.snippet}
                    </p>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
