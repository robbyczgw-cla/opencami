import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Copy01Icon,
  File01Icon,
  TextWrapIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type { HighlighterCore } from 'shiki/core'
import vitesseDark from '@shikijs/themes/vitesse-dark'
import vitesseLight from '@shikijs/themes/vitesse-light'
import langBash from '@shikijs/langs/bash'
import langC from '@shikijs/langs/c'
import langCpp from '@shikijs/langs/cpp'
import langCsharp from '@shikijs/langs/csharp'
import langCss from '@shikijs/langs/css'
import langDiff from '@shikijs/langs/diff'
import langDockerfile from '@shikijs/langs/dockerfile'
import langGo from '@shikijs/langs/go'
import langGraphql from '@shikijs/langs/graphql'
import langHtml from '@shikijs/langs/html'
import langJava from '@shikijs/langs/java'
import langJavascript from '@shikijs/langs/javascript'
import langJson from '@shikijs/langs/json'
import langJsx from '@shikijs/langs/jsx'
import langKotlin from '@shikijs/langs/kotlin'
import langMarkdown from '@shikijs/langs/markdown'
import langPhp from '@shikijs/langs/php'
import langPython from '@shikijs/langs/python'
import langRegexp from '@shikijs/langs/regexp'
import langRuby from '@shikijs/langs/ruby'
import langRust from '@shikijs/langs/rust'
import langShell from '@shikijs/langs/shell'
import langSql from '@shikijs/langs/sql'
import langSwift from '@shikijs/langs/swift'
import langToml from '@shikijs/langs/toml'
import langTypescript from '@shikijs/langs/typescript'
import langTsx from '@shikijs/langs/tsx'
import langXml from '@shikijs/langs/xml'
import langYaml from '@shikijs/langs/yaml'
import { useResolvedTheme } from '@/hooks/use-chat-settings'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatLanguageName, normalizeLanguage, resolveLanguage } from './utils'

type CodeBlockProps = {
  content: string
  ariaLabel?: string
  language?: string
  filename?: string
  className?: string
}

let highlighterPromise: Promise<HighlighterCore> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [vitesseDark, vitesseLight],
      langs: [
        langBash, langC, langCpp, langCsharp, langCss, langDiff,
        langDockerfile, langGo, langGraphql, langHtml, langJava,
        langJavascript, langJson, langJsx, langKotlin, langMarkdown,
        langPhp, langPython, langRegexp, langRuby, langRust, langShell,
        langSql, langSwift, langToml, langTypescript, langTsx, langXml,
        langYaml,
      ],
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}

export function CodeBlock({
  content,
  ariaLabel,
  language = 'text',
  filename,
  className,
}: CodeBlockProps) {
  const resolvedTheme = useResolvedTheme()
  const [copied, setCopied] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [resolvedLanguage, setResolvedLanguage] = useState('text')
  const [headerBg, setHeaderBg] = useState<string | undefined>()
  const [wrap, setWrap] = useState(false)

  const fallback = useMemo(() => {
    return content
  }, [content])

  const normalizedLanguage = normalizeLanguage(language || 'text')
  const themeName = resolvedTheme === 'dark' ? 'vitesse-dark' : 'vitesse-light'

  useEffect(() => {
    let active = true
    getHighlighter()
      .then(async (highlighter) => {
        const lang = resolveLanguage(normalizedLanguage)
        const highlighted = highlighter.codeToHtml(content, {
          lang,
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('opencami-code-wrap')
    setWrap(saved === '1')
  }, [])

  function toggleWrap() {
    setWrap((current) => {
      const next = !current
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('opencami-code-wrap', next ? '1' : '0')
      }
      return next
    })
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const lineCount = content.replace(/\n$/, '').split('\n').length
  const isSingleLine = lineCount <= 1
  const showLineNumbers = !isSingleLine
  const displayLanguage = formatLanguageName(resolvedLanguage)

  return (
    <div
      className={cn(
        'code-block group relative w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-primary-200',
        className,
      )}
    >
      <div
        className={cn('flex items-center justify-between px-3 pt-2')}
        style={{ backgroundColor: headerBg }}
      >
        <span className="text-xs font-medium text-primary-500 flex items-center gap-1.5 min-w-0">
          {filename ? (
            <>
              <HugeiconsIcon icon={File01Icon} size={14} strokeWidth={1.8} />
              <span className="truncate">{filename}</span>
            </>
          ) : (
            displayLanguage
          )}
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            aria-label={wrap ? 'Disable wrap' : 'Enable wrap'}
            className="h-auto px-0 text-xs font-medium text-primary-500 hover:text-primary-800 hover:bg-transparent"
            onClick={toggleWrap}
          >
            <HugeiconsIcon icon={TextWrapIcon} size={14} strokeWidth={1.8} />
            {wrap ? 'No wrap' : 'Wrap'}
          </Button>
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
      </div>
      {html ? (
        <div
          className={cn(
            'w-full min-w-0 max-w-full text-sm text-primary-900 overflow-x-hidden [&>pre]:w-full [&>pre]:min-w-0 [&>pre]:max-w-full [&>pre]:px-3 [&>pre]:py-3',
            wrap
              ? '[&>pre]:whitespace-pre-wrap [&>pre]:break-words [&_.line]:whitespace-pre-wrap [&_.line]:break-words'
              : 'overflow-x-auto [&>pre]:whitespace-pre [&>pre]:overflow-x-auto',
            showLineNumbers &&
              '[&>pre]:[counter-reset:line] [&_.line]:before:content-[counter(line)] [&_.line]:before:[counter-increment:line] [&_.line]:before:inline-block [&_.line]:before:w-8 [&_.line]:before:mr-4 [&_.line]:before:text-right [&_.line]:before:select-none [&_.line]:before:text-primary-500/60',
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className={cn(
            'w-full min-w-0 max-w-full text-sm px-3 py-3 overflow-x-auto',
            wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto',
          )}
        >
          <code className="block">{fallback}</code>
        </pre>
      )}
    </div>
  )
}
