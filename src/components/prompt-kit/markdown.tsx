import { marked } from 'marked'
import { memo, useEffect, useId, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './code-block'
import { languageFromFilePath, markdownHrefToFilePath } from './file-paths'
import {
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { useChatSettingsStore } from '@/hooks/use-chat-settings'

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

function parseMarkdownIntoBlocks(markdown: string): Array<string> {
  const tokens = marked.lexer(markdown)
  return tokens.map((token) => token.raw)
}

function extractLanguage(className?: string): string {
  if (!className) return 'text'
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : 'text'
}

const BASE_COMPONENTS: Partial<Components> = {
  code: function CodeComponent({ className, children }) {
    const isInline = !className?.includes('language-')

    if (isInline) {
      return (
        <code className="rounded bg-primary-100 px-1.5 py-1 text-sm font-mono text-primary-900 border border-primary-200">
          {children}
        </code>
      )
    }

    const language = extractLanguage(className)
    return (
      <CodeBlock
        content={String(children ?? '')}
        language={language}
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
  inlineFilePreviewEnabled: boolean,
): Partial<Components> {
  const FILE_PATH_RE = /^(?:~\/[\w.\-\/]+|\/(?:[\w.\-]+\/)+[\w.\-]+)$/

  return {
    ...BASE_COMPONENTS,
    a: function AComponent({ children, href }) {
      const filePath = markdownHrefToFilePath(href)
      if (inlineFilePreviewEnabled && filePath) {
        return (
          <button
            type="button"
            onClick={() => onOpenFilePreview(filePath)}
            className="font-mono text-primary-900 underline decoration-primary-300 underline-offset-4 hover:decoration-primary-600 cursor-pointer"
          >
            {children}
          </button>
        )
      }

      return (
        <a
          href={href}
          className="text-primary-950 underline decoration-primary-300 underline-offset-4 transition-colors hover:text-primary-950 hover:decoration-primary-500"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    },
    code: function InlineCodeComponent({ children, className }) {
      // If it has a language class, it's a code block (handled by CodeBlock)
      if (className) return <code className={className}>{children}</code>

      // Check if the inline code content looks like a file path
      const text = typeof children === 'string'
        ? children
        : Array.isArray(children)
          ? children.filter((c: unknown) => typeof c === 'string').join('')
          : String(children ?? '')
      if (inlineFilePreviewEnabled && text && FILE_PATH_RE.test(text)) {
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
        remarkPlugins={[remarkGfm, remarkBreaks]}
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
  const inlineFilePreviewEnabled = useChatSettingsStore(
    (state) => state.settings.inlineFilePreview,
  )

  const defaultComponents = useMemo(
    () =>
      createDefaultComponents(
        (path) => setFilePreview({ status: 'loading', path }),
        inlineFilePreviewEnabled,
      ),
    [inlineFilePreviewEnabled],
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
  }, [filePreview])

  const previewOpen = filePreview.status !== 'idle'

  return (
    <>
      <div className={cn('flex flex-col gap-2', className)}>
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
                      // Navigate file explorer to the file's directory
                      let p = filePreview.status !== 'idle' ? filePreview.path : ''
                      if (p) {
                        // The API auto-strips FILES_ROOT, so just use the path as-is
                        // The file explorer uses virtual paths relative to FILES_ROOT
                        const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) || '/' : '/'
                        // Dynamic import to avoid circular deps
                        import('../../screens/files/hooks/use-file-explorer-state').then(m => {
                          m.useFileExplorerState.getState().navigateTo(dir)
                        })
                      }
                    }}
                  >Open in File Explorer</Link>
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
