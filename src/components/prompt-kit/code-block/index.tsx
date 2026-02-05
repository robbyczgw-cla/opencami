import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { createHighlighter } from 'shiki'
import type { BundledLanguage, Highlighter } from 'shiki'
import { useResolvedTheme } from '@/hooks/use-chat-settings'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatLanguageName, normalizeLanguage, resolveLanguage } from './utils'

type CodeBlockProps = {
  content: string
  ariaLabel?: string
  language?: string
  className?: string
}

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['vitesse-light', 'vitesse-dark'],
      langs: ['text'],
    })
  }
  return highlighterPromise
}

export function CodeBlock({
  content,
  ariaLabel,
  language = 'text',
  className,
}: CodeBlockProps) {
  const resolvedTheme = useResolvedTheme()
  const [copied, setCopied] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [resolvedLanguage, setResolvedLanguage] = useState('text')
  const [headerBg, setHeaderBg] = useState<string | undefined>()

  const fallback = useMemo(() => {
    return content
  }, [content])

  const normalizedLanguage = normalizeLanguage(language || 'text')
  const themeName = resolvedTheme === 'dark' ? 'vitesse-dark' : 'vitesse-light'

  useEffect(() => {
    let active = true
    getHighlighter()
      .then(async (highlighter) => {
        let lang = resolveLanguage(normalizedLanguage)
        if (lang !== 'text') {
          try {
            await highlighter.loadLanguage(lang as BundledLanguage)
          } catch {
            lang = 'text'
          }
        }
        const highlighted = highlighter.codeToHtml(content, {
          lang: lang as BundledLanguage,
          theme: themeName,
        })
        if (active) {
          setResolvedLanguage(lang)
          setHtml(highlighted)
          const theme = highlighter.getTheme(themeName)
          setHeaderBg(theme.bg)
        }
      })
      .catch(() => {
        if (active) setHtml(null)
      })
    return () => {
      active = false
    }
  }, [content, normalizedLanguage, themeName])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const isSingleLine = content.split('\n').length === 1
  const displayLanguage = formatLanguageName(resolvedLanguage)

  return (
    <div
      className={cn(
        'group relative min-w-0 overflow-hidden rounded-lg border border-primary-200',
        className,
      )}
    >
      <div
        className={cn('flex items-center justify-between px-3 pt-2')}
        style={{ backgroundColor: headerBg }}
      >
        <span className="text-xs font-medium text-primary-500">
          {displayLanguage}
        </span>
        <Button
          variant="ghost"
          aria-label={ariaLabel ?? 'Copy code'}
          className="h-auto px-0 text-xs font-medium text-primary-500 hover:text-primary-800 hover:bg-transparent"
          onClick={() => {
            handleCopy().catch(() => {})
          }}
        >
          <HugeiconsIcon
            icon={copied ? Tick02Icon : Copy01Icon}
            size={14}
            strokeWidth={1.8}
          />
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {html ? (
        <div
          className={cn(
            'text-sm text-primary-900 [&>pre]:overflow-x-auto',
            isSingleLine
              ? '[&>pre]:whitespace-pre [&>pre]:px-3 [&>pre]:py-2'
              : '[&>pre]:px-3 [&>pre]:py-3',
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className={cn(
            'text-sm',
            isSingleLine ? 'whitespace-pre px-3 py-2' : 'px-3 py-3',
          )}
        >
          <code className="overflow-x-auto">{fallback}</code>
        </pre>
      )}
    </div>
  )
}
