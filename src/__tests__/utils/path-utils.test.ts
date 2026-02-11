import { describe, expect, it } from 'vitest'
import {
  sanitizePath,
  isPathSafe,
  validatePath,
  validateFilename,
} from '@/server/path-utils'

describe('path-utils', () => {
  describe('sanitizePath', () => {
    it('should return root for empty path', () => {
      expect(sanitizePath('')).toBe('/')
    })

    it('should normalize simple paths', () => {
      expect(sanitizePath('/home/user')).toBe('/home/user')
      expect(sanitizePath('/var/log/app')).toBe('/var/log/app')
    })

    it('should add leading slash if missing', () => {
      expect(sanitizePath('home/user')).toBe('/home/user')
      expect(sanitizePath('var/log')).toBe('/var/log')
    })

    it('should resolve . and .. components', () => {
      expect(sanitizePath('/home/./user')).toBe('/home/user')
      expect(sanitizePath('/home/user/../guest')).toBe('/home/guest')
      expect(sanitizePath('/home/user/../../')).toBe('/')
    })

    it('should prevent traversal above root', () => {
      expect(sanitizePath('/../../etc/passwd')).toBe('/etc/passwd')
      expect(sanitizePath('/../../../root')).toBe('/root')
    })

    it('should handle multiple slashes', () => {
      expect(sanitizePath('/home//user///docs')).toBe('/home/user/docs')
    })

    it('should handle trailing slashes', () => {
      expect(sanitizePath('/home/user/')).toBe('/home/user')
    })

    it('should handle non-string input', () => {
      expect(sanitizePath(null as any)).toBe('/')
      expect(sanitizePath(undefined as any)).toBe('/')
      expect(sanitizePath(123 as any)).toBe('/')
    })
  })

  describe('isPathSafe', () => {
    it('should accept safe paths', () => {
      expect(isPathSafe('/home/user')).toBe(true)
      expect(isPathSafe('/var/log/app.log')).toBe(true)
      expect(isPathSafe('/root')).toBe(true)
    })

    it('should reject paths with traversal attempts', () => {
      expect(isPathSafe('../etc/passwd')).toBe(false)
      expect(isPathSafe('/home/../../../etc/passwd')).toBe(false)
      expect(isPathSafe('..')).toBe(false)
    })

    it('should reject paths with null bytes', () => {
      expect(isPathSafe('/home/user\0/evil')).toBe(false)
    })

    it('should reject Windows-style paths', () => {
      expect(isPathSafe('C:\\Windows\\System32')).toBe(false)
      expect(isPathSafe('/home\\user')).toBe(false)
    })

    it('should reject non-string input', () => {
      expect(isPathSafe(null as any)).toBe(false)
      expect(isPathSafe(undefined as any)).toBe(false)
      expect(isPathSafe(123 as any)).toBe(false)
    })

    it('should accept paths with trailing slash', () => {
      expect(isPathSafe('/home/user/')).toBe(true)
    })
  })

  describe('validatePath', () => {
    it('should return sanitized path for valid input', () => {
      expect(validatePath('/home/user')).toBe('/home/user')
      // Note: isPathSafe requires path to already start with /
      // or it considers it unsafe. validatePath sanitizes first then checks.
      // Actually the implementation checks isPathSafe on original path first.
      // So we need to pass a path that's already safe:
      expect(validatePath('/var/log')).toBe('/var/log')
    })

    it('should throw for empty path', () => {
      expect(() => validatePath('')).toThrow('is required')
      expect(() => validatePath(null as any)).toThrow('is required')
    })

    it('should throw for unsafe paths', () => {
      expect(() => validatePath('../etc/passwd')).toThrow('invalid characters')
    })

    it('should use custom context in error message', () => {
      expect(() => validatePath('', 'File path')).toThrow('File path is required')
    })
  })

  describe('validateFilename', () => {
    it('should accept valid filenames', () => {
      expect(validateFilename('document.txt')).toBe(true)
      expect(validateFilename('my-file_v2.pdf')).toBe(true)
      expect(validateFilename('README')).toBe(true)
    })

    it('should reject filenames with path separators', () => {
      expect(validateFilename('path/to/file.txt')).toBe(false)
      expect(validateFilename('path\\file.txt')).toBe(false)
    })

    it('should reject filenames with null bytes', () => {
      expect(validateFilename('file\0.txt')).toBe(false)
    })

    it('should reject control characters', () => {
      expect(validateFilename('file\x00.txt')).toBe(false)
      expect(validateFilename('file\x1F.txt')).toBe(false)
    })

    it('should reject Windows reserved names', () => {
      expect(validateFilename('CON')).toBe(false)
      expect(validateFilename('PRN')).toBe(false)
      expect(validateFilename('AUX')).toBe(false)
      expect(validateFilename('NUL')).toBe(false)
      expect(validateFilename('COM1')).toBe(false)
      expect(validateFilename('LPT1')).toBe(false)
      expect(validateFilename('con.txt')).toBe(false)
    })

    it('should reject . and .. as filenames', () => {
      expect(validateFilename('.')).toBe(false)
      expect(validateFilename('..')).toBe(false)
    })

    it('should reject empty filenames', () => {
      expect(validateFilename('')).toBe(false)
      expect(validateFilename(null as any)).toBe(false)
    })
  })
})
