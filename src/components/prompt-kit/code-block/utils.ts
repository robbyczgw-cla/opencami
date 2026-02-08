const SUPPORTED_LANGUAGES = new Set([
  'bash', 'c', 'cpp', 'csharp', 'css', 'diff', 'dockerfile', 'go',
  'graphql', 'html', 'java', 'javascript', 'json', 'jsx', 'kotlin',
  'markdown', 'php', 'python', 'regexp', 'ruby', 'rust', 'shell',
  'sql', 'swift', 'toml', 'typescript', 'tsx', 'xml', 'yaml',
])

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  typescriptreact: 'tsx',
  javascriptreact: 'jsx',
  react: 'jsx',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  md: 'markdown',
  txt: 'text',
}

export function normalizeLanguage(language: string): string {
  const cleaned = language
    .trim()
    .toLowerCase()
    .replace(/^language-/, '')
    .replace(/^\[|\]$/g, '')
  const token = cleaned.split(/[\s,]+/)[0] || 'text'
  return LANGUAGE_ALIASES[token] ?? token
}

export function resolveLanguage(language: string): string {
  const normalized = normalizeLanguage(language)
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'text'
}

export function formatLanguageName(language: string): string {
  const names: Record<string, string> = {
    bash: 'Bash',
    python: 'Python',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    tsx: 'TSX',
    jsx: 'JSX',
    json: 'JSON',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    yaml: 'YAML',
    markdown: 'Markdown',
    text: 'Plain Text',
  }
  return names[language] || language.charAt(0).toUpperCase() + language.slice(1)
}
