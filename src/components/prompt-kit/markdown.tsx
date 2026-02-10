import { marked } from 'marked'
import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './code-block'
import {
  isLikelyFilePath,
  languageFromFilePath,
  markdownHrefToFilePath,
  remarkFilePathLinks,
} from './file-paths'
import {
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useFileExplorerState } from '../../screens/files/hooks/use-file-explorer-state'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'
import { Link, useNavigate } from '@tanstack/react-router'

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
}

type FilePreviewState =
  | { status: 'idle' }
  | { status: 'loading'; path: string }
  | { status: 'success'; path: string; content: string; language: string }
  | { status: 'error'; path: string; message: string }

const INLINE_PREVIEW_MAX_BYTES = 100 * 1024

function normalizeClickedPath(path: string): string {
  if (!path) return '/'
  return path.includes('/') ? path : `/${path}`
}

function toWorkspacePath(path: string): string {
  let p = normalizeClickedPath(path)
  const prefixes = ['/root/clawd/', '/root/']
  for (const prefix of prefixes) {
    if (p.startsWith(prefix)) {
      p = '/' + p.slice(prefix.length)
      break
    }
  }
  return p.startsWith('/') ? p : `/${p}`
}

function hasExtension(path: string): boolean {
  const trimmed = path.replace(/\/+$/, '')
  const name = trimmed.split('/').pop() || ''
  if (!name || name.startsWith('.')) return false
  return name.includes('.')
}

function isDirectoryPathHeuristic(path: string): boolean {
  if (!path) return false
  return path.endsWith('/') || !hasExtension(path)
}

function isDirectoryError(code?: string, message?: string): boolean {
  const normalizedCode = String(code || '').toUpperCase()
  const normalizedMessage = String(message || '').toLowerCase()
  return (
    normalizedCode.includes('DIRECTORY') ||
    normalizedMessage.includes('is a directory') ||
    normalizedMessage.includes('directory')
  )
}

function parseMarkdownIntoBlocks(markdown: string): Array<string> {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

function extractLanguage(className?: string): string {
  if (!className) return 'text'
  const match = className.match(/language-([\w-]+)/)
  return match ? match[1] : 'text'
}

function extractFilenameFromMeta(meta?: string): string | undefined {
  const value = meta?.trim()
  if (!value) return undefined
  const firstToken = value.split(/\s+/)[0]
  return firstToken || undefined
}

const BASE_COMPONENTS: Partial<Components> = {
  code: function CodeComponent({ className, children, node }) {
    const isInline = !className?.includes('language-')

    if (isInline) {
      return (
        <code className="rounded bg-primary-100 px-1.5 py-1 text-sm font-mono text-primary-900 border border-primary-200">
          {children}
        </code>
      )
    }

    const language = extractLanguage(className)
    const filename = extractFilenameFromMeta(
      (node?.data as { meta?: string } | undefined)?.meta,
    )
    return (
      <CodeBlock
        content={String(children ?? '')}
        language={language}
        filename={filename}
        className="w-full"
      />
    )
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>
  },
  h1: function H1Component({ children }) {
    return <h1 className="text-xl font-medium text-primary-950">{children}</h1>
  },
  h2: function H2Component({ children }) {
    return <h2 className="text-lg font-medium text-primary-900">{children}</h2>
  },
  h3: function H3Component({ children }) {
    return <h3 className="font-medium text-primary-900">{children}</h3>
  },
  p: function PComponent({ children }) {
    return (
      <p className="text-primary-950 text-pretty leading-relaxed">{children}</p>
    )
  },
  ul: function UlComponent({ children }) {
    return (
      <ul className="ml-4 list-disc text-primary-950 marker:text-primary-400">
        {children}
      </ul>
    )
  },
  ol: function OlComponent({ children }) {
    return (
      <ol className="ml-4 list-decimal text-primary-950 marker:text-primary-500">
        {children}
      </ol>
    )
  },
  li: function LiComponent({ children }) {
    return <li className="leading-relaxed">{children}</li>
  },
  blockquote: function BlockquoteComponent({ children }) {
    return (
      <blockquote className="border-l-2 border-primary-300 pl-4 text-primary-900 italic">
        {children}
      </blockquote>
    )
  },
  strong: function StrongComponent({ children }) {
    return <strong className="font-medium text-primary-950">{children}</strong>
  },
  em: function EmComponent({ children }) {
    return <em className="italic text-primary-950">{children}</em>
  },
  hr: function HrComponent() {
    return <hr className="my-3 border-primary-200" />
  },
  table: function TableComponent({ children }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    )
  },
  thead: function TheadComponent({ children }) {
    return (
      <thead className="border-b border-primary-200 bg-primary-50">
        {children}
      </thead>
    )
  },
  tbody: function TbodyComponent({ children }) {
    return <tbody className="divide-y divide-primary-100">{children}</tbody>
  },
  tr: function TrComponent({ children }) {
    return (
      <tr className="transition-colors hover:bg-primary-50/50">{children}</tr>
    )
  },
  th: function ThComponent({ children }) {
    return (
      <th className="px-3 py-2 text-left font-medium text-primary-950">
        {children}
      </th>
    )
  },
  td: function TdComponent({ children }) {
    return <td className="px-3 py-2 text-primary-950">{children}</td>
  },
}

function createDefaultComponents(
  onOpenFilePreview: (path: string) => void,
): Partial<Components> {
  return {
    ...BASE_COMPONENTS,
    a: function AComponent({ children, href }) {
      const filePath = markdownHrefToFilePath(href)
      if (filePath) {
        return (
          <button
            type="button"
            onClick={() => onOpenFilePreview(filePath)}
            className="font-mono text-[var(--opencami-accent)] underline decoration-[var(--opencami-accent-light)] underline-offset-4 hover:opacity-90 cursor-pointer"
          >
            {children}
          </button>
        )
      }

      return (
        <a
          href={href}
          onClick={(event) => {
            // Safety guard: never allow browser navigation for our internal file scheme.
            if (href?.startsWith('openclaw-file://')) event.preventDefault()
          }}
          className="text-[var(--opencami-accent)] underline decoration-[var(--opencami-accent-light)] underline-offset-4 transition-opacity hover:opacity-90"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    },
    code: function InlineCodeComponent({ children, className, node }) {
      if (className?.includes('language-')) {
        const language = extractLanguage(className)
        const filename = extractFilenameFromMeta(
          (node?.data as { meta?: string } | undefined)?.meta,
        )
        return (
          <CodeBlock
            content={String(children ?? '')}
            language={language}
            filename={filename}
            className="w-full"
          />
        )
      }

      // Check if the inline code content looks like a file path
      const text = typeof children === 'string'
        ? children
        : Array.isArray(children)
          ? children.filter((c: unknown) => typeof c === 'string').join('')
          : String(children ?? '')
      if (text && isLikelyFilePath(text)) {
        return (
          <button
            type="button"
            onClick={() => onOpenFilePreview(text)}
            className="font-mono text-sm bg-primary-100 rounded px-1.5 py-0.5 text-primary-900 underline decoration-primary-300 underline-offset-4 hover:decoration-primary-600 cursor-pointer"
          >
            {children}
          </button>
        )
      }

      return (
        <code className="font-mono text-sm bg-primary-100 rounded px-1.5 py-0.5 text-primary-900">
          {children}
        </code>
      )
    },
  }
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components,
  }: {
    content: string
    components?: Partial<Components>
  }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkFilePathLinks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    )
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content
  },
)

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock'

function fileErrorMessageFromResponse(status: number, code?: string): string {
  if (code === 'NOT_FOUND' || status === 404) return 'File not found'
  if (code === 'UNSUPPORTED_TYPE') return 'Binary file'
  if (code === 'FILE_TOO_LARGE' || status === 413) return 'File too large'
  return 'Failed to load file preview'
}

function MarkdownComponent({
  children,
  id,
  className,
  components,
}: MarkdownProps) {
  const generatedId = useId()
  const blockId = id ?? generatedId
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])
  const [filePreview, setFilePreview] = useState<FilePreviewState>({ status: 'idle' })
  const navigate = useNavigate()

  const openDirectoryInExplorer = useCallback((path: string) => {
    const workspacePath = toWorkspacePath(path)
    useFileExplorerState.getState().navigateTo(workspacePath)
    setFilePreview({ status: 'idle' })
    navigate({ to: '/files' })
  }, [navigate])

  const onOpenFilePreview = useCallback((path: string) => {
    const resolvedPath = normalizeClickedPath(path)
    if (isDirectoryPathHeuristic(resolvedPath)) {
      openDirectoryInExplorer(resolvedPath)
      return
    }
    setFilePreview({ status: 'loading', path: resolvedPath })
  }, [openDirectoryInExplorer])

  const defaultComponents = useMemo(
    () => createDefaultComponents(onOpenFilePreview),
    [onOpenFilePreview],
  )

  const mergedComponents = useMemo(
    () => ({ ...defaultComponents, ...(components || {}) }),
    [defaultComponents, components],
  )

  useEffect(() => {
    if (filePreview.status !== 'loading') return

    const path = filePreview.path
    const controller = new AbortController()

    fetch(`/api/files/read?path=${encodeURIComponent(path)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (isDirectoryError(payload.code, payload.message)) {
            openDirectoryInExplorer(path)
            return
          }
          const error = fileErrorMessageFromResponse(response.status, payload.code)
          setFilePreview({ status: 'error', path, message: error })
          return
        }

        const size = Number(payload.size ?? 0)
        if (size > INLINE_PREVIEW_MAX_BYTES) {
          setFilePreview({ status: 'error', path, message: 'File too large' })
          return
        }

        const content = String(payload.content ?? '')
        setFilePreview({
          status: 'success',
          path,
          content,
          language: languageFromFilePath(path),
        })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setFilePreview({ status: 'error', path, message: 'Failed to load file preview' })
      })

    return () => controller.abort()
  }, [filePreview, openDirectoryInExplorer])

  const previewOpen = filePreview.status !== 'idle'

  return (
    <>
      <div
        className={cn('flex min-w-0 max-w-full flex-col gap-2 overflow-x-hidden', className)}
        onClickCapture={(event) => {
          const target = event.target as HTMLElement | null
          const anchor = target?.closest?.('a[href^="openclaw-file://"]') as HTMLAnchorElement | null
          if (!anchor) return

          const filePath = markdownHrefToFilePath(anchor.getAttribute('href') ?? undefined)
          if (!filePath) return

          event.preventDefault()
          event.stopPropagation()
          onOpenFilePreview(filePath)
        }}
      >
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock
            key={`${blockId}-block-${index}`}
            content={block}
            components={mergedComponents}
          />
        ))}
      </div>

      <DialogRoot
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open) setFilePreview({ status: 'idle' })
        }}
      >
        <DialogContent className="w-[min(1000px,95vw)] max-h-[88vh] overflow-hidden p-0">
          <div className="border-b border-primary-200 px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base">File Preview</DialogTitle>
              {filePreview.status !== 'idle' && (
                <p className="text-xs text-primary-600 font-mono truncate">{filePreview.path}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {filePreview.status !== 'idle' && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to="/files"
                    onClick={() => {
                      const p = filePreview.status !== 'idle' ? toWorkspacePath(filePreview.path) : ''
                      if (p) {
                        const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) || '/' : '/'
                        useFileExplorerState.getState().navigateTo(dir)
                      }
                      setFilePreview({ status: 'idle' })
                    }}
                  >Open in Explorer</Link>
                </Button>
              )}
              {filePreview.status !== 'idle' && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to="/files"
                    onClick={() => {
                      const p = filePreview.status !== 'idle' ? toWorkspacePath(filePreview.path) : ''
                      if (p) {
                        useFileExplorerState.getState().openInEditor(p)
                      }
                      setFilePreview({ status: 'idle' })
                    }}
                  >Open in Editor</Link>
                </Button>
              )}
              <DialogClose>Close</DialogClose>
            </div>
          </div>

          <div className="p-4 overflow-auto max-h-[calc(88vh-72px)]">
            {filePreview.status === 'loading' && (
              <p className="text-sm text-primary-600">Loading preview…</p>
            )}

            {filePreview.status === 'error' && (
              <p className="text-sm text-red-600">{filePreview.message}</p>
            )}

            {filePreview.status === 'success' && (
              <CodeBlock
                content={filePreview.content}
                language={filePreview.language}
                className="w-full"
              />
            )}
          </div>
        </DialogContent>
      </DialogRoot>
    </>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = 'Markdown'

export { Markdown }
