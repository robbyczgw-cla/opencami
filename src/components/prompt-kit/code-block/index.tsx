import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Copy01Icon,
  File01Icon,
  PlayIcon,
  TextWrapIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import type { HighlighterCore, LanguageRegistration } from 'shiki/core'
import { useResolvedTheme } from '@/hooks/use-chat-settings'
import { useArtifactsStore } from '@/hooks/use-artifacts'
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

// Lazy language loaders - only load grammars when needed
const languageLoaders: Record<string, () => Promise<LanguageRegistration[]>> = {
  bash: () => import('@shikijs/langs/bash').then(m => m.default),
  c: () => import('@shikijs/langs/c').then(m => m.default),
  cpp: () => import('@shikijs/langs/cpp').then(m => m.default),
  csharp: () => import('@shikijs/langs/csharp').then(m => m.default),
  css: () => import('@shikijs/langs/css').then(m => m.default),
  diff: () => import('@shikijs/langs/diff').then(m => m.default),
  dockerfile: () => import('@shikijs/langs/dockerfile').then(m => m.default),
  go: () => import('@shikijs/langs/go').then(m => m.default),
  graphql: () => import('@shikijs/langs/graphql').then(m => m.default),
  html: () => import('@shikijs/langs/html').then(m => m.default),
  java: () => import('@shikijs/langs/java').then(m => m.default),
  javascript: () => import('@shikijs/langs/javascript').then(m => m.default),
  json: () => import('@shikijs/langs/json').then(m => m.default),
  jsx: () => import('@shikijs/langs/jsx').then(m => m.default),
  kotlin: () => import('@shikijs/langs/kotlin').then(m => m.default),
  markdown: () => import('@shikijs/langs/markdown').then(m => m.default),
  php: () => import('@shikijs/langs/php').then(m => m.default),
  python: () => import('@shikijs/langs/python').then(m => m.default),
  regexp: () => import('@shikijs/langs/regexp').then(m => m.default),
  ruby: () => import('@shikijs/langs/ruby').then(m => m.default),
  rust: () => import('@shikijs/langs/rust').then(m => m.default),
  shell: () => import('@shikijs/langs/shell').then(m => m.default),
  sql: () => import('@shikijs/langs/sql').then(m => m.default),
  swift: () => import('@shikijs/langs/swift').then(m => m.default),
  toml: () => import('@shikijs/langs/toml').then(m => m.default),
  typescript: () => import('@shikijs/langs/typescript').then(m => m.default),
  tsx: () => import('@shikijs/langs/tsx').then(m => m.default),
  xml: () => import('@shikijs/langs/xml').then(m => m.default),
  yaml: () => import('@shikijs/langs/yaml').then(m => m.default),
}

// Aliases for common language names
const languageAliases: Record<string, string> = {
  sh: 'bash',
  zsh: 'bash',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  cs: 'csharp',
  'c++': 'cpp',
  yml: 'yaml',
  md: 'markdown',
  docker: 'dockerfile',
}

let highlighterPromise: Promise<HighlighterCore> | null = null
const loadedLanguages = new Set<string>()

async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    // Lazy load Shiki core and themes
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, vitesseDark, vitesseLight] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('@shikijs/themes/vitesse-dark').then(m => m.default),
      import('@shikijs/themes/vitesse-light').then(m => m.default),
    ])
    
    highlighterPromise = createHighlighterCore({
      themes: [vitesseDark, vitesseLight],
      langs: [], // Start with no languages, load on demand
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}

async function ensureLanguageLoaded(highlighter: HighlighterCore, lang: string): Promise<string> {
  // Resolve aliases
  const resolvedLang = languageAliases[lang] || lang
  
  // If already loaded or no loader exists, return
  if (loadedLanguages.has(resolvedLang)) {
    return resolvedLang
  }
  
  const loader = languageLoaders[resolvedLang]
  if (!loader) {
    // Fall back to plaintext for unknown languages
    return 'text'
  }
  
  try {
    const langModule = await loader()
    await highlighter.loadLanguage(langModule)
    loadedLanguages.add(resolvedLang)
    return resolvedLang
  } catch {
    return 'text'
  }
}

export function CodeBlock({
  content,
  ariaLabel,
  language = 'text',
  filename,
  className,
}: CodeBlockProps) {
  const resolvedTheme = useResolvedTheme()
  const artifactsEnabled = useArtifactsStore((s) => s.isEnabled)
  const [copied, setCopied] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [resolvedLanguage, setResolvedLanguage] = useState('text')
  const [headerBg, setHeaderBg] = useState<string | undefined>()
  const [wrap, setWrap] = useState(false)

  const normalizedLang = language?.toLowerCase() ?? ''
  const isPreviewable = artifactsEnabled && (normalizedLang === 'html' || normalizedLang === 'svg')

  const fallback = useMemo(() => {
    return content
  }, [content])

  const normalizedLanguage = normalizeLanguage(language || 'text')
  const themeName = resolvedTheme === 'dark' ? 'vitesse-dark' : 'vitesse-light'

  useEffect(() => {
    let active = true
    
    async function highlight() {
      try {
        const highlighter = await getHighlighter()
        if (!active) return
        
        // Lazy load the specific language needed
        const baseLang = resolveLanguage(normalizedLanguage)
        const lang = await ensureLanguageLoaded(highlighter, baseLang)
        if (!active) return
        
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
      } catch {
        if (active) setHtml(null)
      }
    }
    
    highlight()
    
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
          {isPreviewable && (
            <Button
              variant="ghost"
              aria-label="Preview in Artifacts panel"
              className="h-auto px-0 text-xs font-medium text-primary-500 hover:text-primary-800 hover:bg-transparent"
              onClick={() => {
                useArtifactsStore.getState().setArtifact(content, normalizedLang as 'html' | 'svg')
              }}
            >
              <HugeiconsIcon icon={PlayIcon} size={14} strokeWidth={1.8} />
              Preview
            </Button>
          )}
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
