import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn (classNames utility)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('should merge Tailwind classes correctly', () => {
    // tailwind-merge should dedupe conflicting utilities
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    expect(cn('mt-2', 'mt-4')).toBe('mt-4')
  })

  it('should handle mixed inputs', () => {
    expect(cn('base', ['array'], { obj: true })).toBe('base array obj')
  })

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })
})
