import { resolveLanguage } from './code-block/utils'

export type FilePathSegment = {
  type: 'text' | 'path'
  value: string
}

const KNOWN_FILE_EXTENSIONS = [
  'md',
  'txt',
  'json',
  'yaml',
  'yml',
  'toml',
  'py',
  'js',
  'ts',
  'tsx',
  'jsx',
  'css',
  'scss',
  'html',
  'xml',
  'sh',
  'bash',
  'go',
  'rs',
  'rb',
  'php',
  'java',
  'kt',
  'swift',
  'c',
  'cpp',
  'h',
  'hpp',
  'sql',
  'graphql',
  'dockerfile',
  'env',
  'conf',
  'cfg',
  'ini',
  'log',
  'csv',
] as const

const EXTENSION_PATTERN = KNOWN_FILE_EXTENSIONS.join('|')

const ABSOLUTE_OR_HOME_PATH_PATTERN = '(?:~\\/[A-Za-z0-9._\\-\\/]*[A-Za-z0-9._\\-\\/]|\\/(?:[\\w.\\-]+\\/)*[\\w.\\-]+\\/?)'
const RELATIVE_PATH_PATTERN = '(?:[A-Za-z0-9._\\-]+(?:\\/[A-Za-z0-9._\\-]+)+\\/?)'
const BARE_FILENAME_PATTERN = `(?:[A-Za-z0-9_-][A-Za-z0-9._-]*[A-Za-z0-9_-]\\.(?:${EXTENSION_PATTERN})|dockerfile)`

const FILE_PATH_REGEX = new RegExp(
  `(^|[\\s"'(,;:])(${ABSOLUTE_OR_HOME_PATH_PATTERN}|${RELATIVE_PATH_PATTERN}|${BARE_FILENAME_PATTERN})(?=$|[\\s"'),;:!?])`,
  'gi',
)

function trimTrailingPunctuation(path: string): { path: string; trailing: string } {
  if (!path) return { path: path ?? '', trailing: '' }
  const match = path.match(/^(.*?)([),.;:!?]+)?$/)
  if (!match) return { path, trailing: '' }
  return { path: match[1] || path, trailing: match[2] || '' }
}

export function isLikelyFilePath(text: string): boolean {
  if (!text) return false
  FILE_PATH_REGEX.lastIndex = 0
  const match = FILE_PATH_REGEX.exec(text)
  if (!match) return false

  const prefix = match[1] || ''
  const value = match[2] || ''
  const matchStart = match.index + prefix.length
  const matchEnd = matchStart + value.length

  return matchStart === 0 && matchEnd === text.length
}

export function splitTextByFilePaths(text: string): FilePathSegment[] {
  if (!text) return [{ type: 'text', value: text }]

  const segments: FilePathSegment[] = []
  let lastIndex = 0
  FILE_PATH_REGEX.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = FILE_PATH_REGEX.exec(text)) !== null) {
    const prefix = match[1] || ''
    const rawPath = match[2] || ''
    const fullMatch = match[0]
    const start = match.index
    const prefixStart = start
    const pathStart = start + prefix.length

    if (prefixStart > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, prefixStart) })
    }

    if (prefix) {
      segments.push({ type: 'text', value: prefix })
    }

    const { path, trailing } = trimTrailingPunctuation(rawPath)

    if (path.length > 1) {
      segments.push({ type: 'path', value: path })
      if (trailing) {
        segments.push({ type: 'text', value: trailing })
      }
    } else {
      segments.push({ type: 'text', value: fullMatch })
    }

    lastIndex = pathStart + rawPath.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

export function filePathToMarkdownHref(path: string): string {
  return `openclaw-file://${encodeURIComponent(path)}`
}

export function markdownHrefToFilePath(href?: string): string | null {
  if (!href?.startsWith('openclaw-file://')) return null
  try {
    return decodeURIComponent(href.slice('openclaw-file://'.length))
  } catch {
    return null
  }
}

export function remarkFilePathLinks() {
  return (tree: any) => {
    function visit(node: any, parent: any) {
      if (!node) return

      if (
        node.type === 'text' &&
        parent &&
        parent.type !== 'link' &&
        parent.type !== 'inlineCode' &&
        parent.type !== 'code'
      ) {
        const segments = splitTextByFilePaths(String(node.value || ''))
        const hasPaths = segments.some((segment) => segment.type === 'path')
        if (!hasPaths) return

        const replacement = segments.map((segment) => {
          if (segment.type === 'text') {
            return { type: 'text', value: segment.value }
          }

          return {
            type: 'link',
            url: filePathToMarkdownHref(segment.value),
            children: [{ type: 'text', value: segment.value }],
          }
        })

        const index = parent.children.indexOf(node)
        if (index >= 0) {
          parent.children.splice(index, 1, ...replacement)
        }
        return
      }

      if (Array.isArray(node.children)) {
        for (const child of [...node.children]) {
          visit(child, node)
        }
      }
    }

    visit(tree, null)
  }
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  py: 'python',
  ts: 'typescript',
  js: 'javascript',
  jsx: 'jsx',
  tsx: 'tsx',
  json: 'json',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  html: 'html',
  css: 'css',
  sql: 'sql',
  xml: 'xml',
  toml: 'toml',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  graphql: 'graphql',
  diff: 'diff',
  patch: 'diff',
  env: 'text',
}

export function languageFromFilePath(path: string): string {
  if (!path) return 'text'
  const filename = path.split('/').pop() || ''
  const lower = filename.toLowerCase()

  if (lower === 'dockerfile') return 'dockerfile'
  if (lower === 'makefile') return 'text'

  const parts = lower.split('.')
  const extension = parts.length > 1 ? parts.pop() || '' : ''
  const mapped = EXTENSION_LANGUAGE_MAP[extension] || extension || 'text'

  return resolveLanguage(mapped)
}
