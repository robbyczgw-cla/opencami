import { describe, expect, it } from 'vitest'
import {
  isLikelyFilePath,
  splitTextByFilePaths,
  filePathToMarkdownHref,
  markdownHrefToFilePath,
  languageFromFilePath,
} from '@/components/prompt-kit/file-paths'

describe('file-paths', () => {
  describe('isLikelyFilePath', () => {
    it('should detect absolute paths', () => {
      expect(isLikelyFilePath('/home/user/file.txt')).toBe(true)
      expect(isLikelyFilePath('/var/log/app.log')).toBe(true)
      expect(isLikelyFilePath('/etc/config')).toBe(true)
    })

    it('should detect home directory paths', () => {
      expect(isLikelyFilePath('~/Documents/file.txt')).toBe(true)
      expect(isLikelyFilePath('~/.bashrc')).toBe(true)
    })

    it('should detect relative paths', () => {
      expect(isLikelyFilePath('src/components/App.tsx')).toBe(true)
      expect(isLikelyFilePath('./config/settings.json')).toBe(true)
    })

    it('should detect filenames with known extensions', () => {
      expect(isLikelyFilePath('readme.md')).toBe(true)
      expect(isLikelyFilePath('config.json')).toBe(true)
      expect(isLikelyFilePath('script.py')).toBe(true)
      expect(isLikelyFilePath('Dockerfile')).toBe(true)
    })

    it('should reject non-file text', () => {
      expect(isLikelyFilePath('hello world')).toBe(false)
      expect(isLikelyFilePath('just some text')).toBe(false)
      expect(isLikelyFilePath('')).toBe(false)
    })
  })

  describe('splitTextByFilePaths', () => {
    it('should split text containing file paths', () => {
      const result = splitTextByFilePaths('Check /home/user/file.txt for details')
      expect(result.length).toBeGreaterThan(1)
      const pathSegment = result.find(s => s.type === 'path')
      expect(pathSegment?.value).toBe('/home/user/file.txt')
    })

    it('should handle multiple paths in text', () => {
      const result = splitTextByFilePaths('Copy /src/a.ts to /src/b.ts')
      const paths = result.filter(s => s.type === 'path')
      expect(paths.length).toBe(2)
    })

    it('should return text segments for non-path content', () => {
      const result = splitTextByFilePaths('Hello world')
      expect(result).toEqual([{ type: 'text', value: 'Hello world' }])
    })

    it('should handle empty input', () => {
      const result = splitTextByFilePaths('')
      expect(result).toEqual([{ type: 'text', value: '' }])
    })

    it('should handle text with only a path', () => {
      const result = splitTextByFilePaths('/home/user/file.txt')
      const pathSegment = result.find(s => s.type === 'path')
      expect(pathSegment?.value).toBe('/home/user/file.txt')
    })
  })

  describe('filePathToMarkdownHref', () => {
    it('should create openclaw-file:// URLs', () => {
      expect(filePathToMarkdownHref('/home/user/file.txt')).toBe(
        'openclaw-file://%2Fhome%2Fuser%2Ffile.txt'
      )
    })

    it('should encode special characters', () => {
      const href = filePathToMarkdownHref('/path/with spaces/file.txt')
      expect(href).toContain('openclaw-file://')
      expect(href).toContain('%20')
    })
  })

  describe('markdownHrefToFilePath', () => {
    it('should extract file path from valid href', () => {
      const href = 'openclaw-file://%2Fhome%2Fuser%2Ffile.txt'
      expect(markdownHrefToFilePath(href)).toBe('/home/user/file.txt')
    })

    it('should return null for non-openclaw URLs', () => {
      expect(markdownHrefToFilePath('https://example.com')).toBe(null)
      expect(markdownHrefToFilePath('file:///path')).toBe(null)
    })

    it('should return null for undefined/empty', () => {
      expect(markdownHrefToFilePath(undefined)).toBe(null)
      expect(markdownHrefToFilePath('')).toBe(null)
    })

    it('should handle decode errors gracefully', () => {
      // Invalid percent encoding
      expect(markdownHrefToFilePath('openclaw-file://%ZZ')).toBe(null)
    })
  })

  describe('languageFromFilePath', () => {
    it('should detect Python files', () => {
      expect(languageFromFilePath('/home/user/script.py')).toBe('python')
    })

    it('should detect JavaScript files', () => {
      expect(languageFromFilePath('app.js')).toBe('javascript')
    })

    it('should detect TypeScript files', () => {
      expect(languageFromFilePath('component.ts')).toBe('typescript')
      expect(languageFromFilePath('component.tsx')).toBe('tsx')
    })

    it('should detect JSON files', () => {
      expect(languageFromFilePath('package.json')).toBe('json')
    })

    it('should detect YAML files', () => {
      expect(languageFromFilePath('config.yml')).toBe('yaml')
      expect(languageFromFilePath('config.yaml')).toBe('yaml')
    })

    it('should detect Dockerfile', () => {
      expect(languageFromFilePath('Dockerfile')).toBe('dockerfile')
      expect(languageFromFilePath('/app/Dockerfile')).toBe('dockerfile')
    })

    it('should detect shell scripts', () => {
      expect(languageFromFilePath('script.sh')).toBe('bash')
      expect(languageFromFilePath('script.bash')).toBe('bash')
    })

    it('should return text for unknown extensions', () => {
      expect(languageFromFilePath('file.unknown')).toBe('text')
      expect(languageFromFilePath('')).toBe('text')
    })
  })
})
