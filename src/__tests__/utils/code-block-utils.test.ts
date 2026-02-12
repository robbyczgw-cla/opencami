import { describe, expect, it } from 'vitest'
import {
  normalizeLanguage,
  resolveLanguage,
  formatLanguageName,
} from '@/components/prompt-kit/code-block/utils'

describe('code-block utils', () => {
  describe('normalizeLanguage', () => {
    it('should lowercase language names', () => {
      expect(normalizeLanguage('Python')).toBe('python')
      expect(normalizeLanguage('JAVASCRIPT')).toBe('javascript')
    })

    it('should trim whitespace', () => {
      expect(normalizeLanguage('  python  ')).toBe('python')
      expect(normalizeLanguage('\tjavascript\n')).toBe('javascript')
    })

    it('should remove language- prefix', () => {
      expect(normalizeLanguage('language-javascript')).toBe('javascript')
      expect(normalizeLanguage('language-python')).toBe('python')
    })

    it('should remove brackets', () => {
      expect(normalizeLanguage('[python]')).toBe('python')
      expect(normalizeLanguage('[javascript]')).toBe('javascript')
    })

    it('should apply language aliases', () => {
      expect(normalizeLanguage('js')).toBe('javascript')
      expect(normalizeLanguage('ts')).toBe('typescript')
      expect(normalizeLanguage('sh')).toBe('bash')
      expect(normalizeLanguage('shell')).toBe('bash')
      expect(normalizeLanguage('yml')).toBe('yaml')
      expect(normalizeLanguage('md')).toBe('markdown')
    })

    it('should handle react aliases', () => {
      expect(normalizeLanguage('typescriptreact')).toBe('tsx')
      expect(normalizeLanguage('javascriptreact')).toBe('jsx')
      expect(normalizeLanguage('react')).toBe('jsx')
    })

    it('should take first token for multi-word input', () => {
      expect(normalizeLanguage('python 3.9')).toBe('python')
      expect(normalizeLanguage('javascript, typescript')).toBe('javascript')
    })

    it('should return text for empty input', () => {
      expect(normalizeLanguage('')).toBe('text')
      expect(normalizeLanguage('   ')).toBe('text')
    })
  })

  describe('resolveLanguage', () => {
    it('should return language if supported', () => {
      expect(resolveLanguage('python')).toBe('python')
      expect(resolveLanguage('javascript')).toBe('javascript')
      expect(resolveLanguage('typescript')).toBe('typescript')
      expect(resolveLanguage('bash')).toBe('bash')
    })

    it('should return text for unsupported languages', () => {
      expect(resolveLanguage('brainfuck')).toBe('text')
      expect(resolveLanguage('unknownlang')).toBe('text')
    })

    it('should normalize before checking', () => {
      expect(resolveLanguage('js')).toBe('javascript')
      expect(resolveLanguage('ts')).toBe('typescript')
      expect(resolveLanguage('PYTHON')).toBe('python')
    })
  })

  describe('formatLanguageName', () => {
    it('should return friendly names for known languages', () => {
      expect(formatLanguageName('python')).toBe('Python')
      expect(formatLanguageName('javascript')).toBe('JavaScript')
      expect(formatLanguageName('typescript')).toBe('TypeScript')
      expect(formatLanguageName('tsx')).toBe('TSX')
      expect(formatLanguageName('jsx')).toBe('JSX')
      expect(formatLanguageName('json')).toBe('JSON')
      expect(formatLanguageName('html')).toBe('HTML')
      expect(formatLanguageName('css')).toBe('CSS')
      expect(formatLanguageName('sql')).toBe('SQL')
      expect(formatLanguageName('yaml')).toBe('YAML')
    })

    it('should capitalize unknown languages', () => {
      expect(formatLanguageName('rust')).toBe('Rust')
      expect(formatLanguageName('go')).toBe('Go')
    })

    it('should return Plain Text for text', () => {
      expect(formatLanguageName('text')).toBe('Plain Text')
    })
  })
})
