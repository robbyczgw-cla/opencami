import { describe, expect, it, vi } from 'vitest'
import { highlightMatch } from '@/hooks/use-search'

describe('highlightMatch utility', () => {
  it('should return null for empty query', () => {
    const result = highlightMatch('some text to search', '')
    expect(result).toBeNull()
  })

  it('should return null for whitespace-only query', () => {
    const result = highlightMatch('some text to search', '   ')
    expect(result).toBeNull()
  })

  it('should return null when no match found', () => {
    const result = highlightMatch('hello world', 'xyz')
    expect(result).toBeNull()
  })

  it('should highlight matching text', () => {
    const result = highlightMatch('hello world', 'world')
    expect(result).not.toBeNull()
    expect(result?.match).toBe('world')
    expect(result?.before).toBe('hello ')
    expect(result?.after).toBe('')
  })

  it('should be case insensitive', () => {
    const result = highlightMatch('Hello World', 'WORLD')
    expect(result).not.toBeNull()
    expect(result?.match).toBe('World')
  })

  it('should include context around match', () => {
    const longText = 'This is a very long piece of text that contains the word match somewhere in the middle of it.'
    const result = highlightMatch(longText, 'match')
    expect(result).not.toBeNull()
    expect(result?.match).toBe('match')
    expect(result?.before.length).toBeGreaterThan(0)
    expect(result?.after.length).toBeGreaterThan(0)
  })

  it('should add ellipsis for truncated context', () => {
    const longText = 'A'.repeat(100) + 'match' + 'B'.repeat(100)
    const result = highlightMatch(longText, 'match')
    expect(result).not.toBeNull()
    expect(result?.before.startsWith('...')).toBe(true)
    expect(result?.after.endsWith('...')).toBe(true)
  })

  it('should handle match at beginning of text', () => {
    const result = highlightMatch('match is at the start', 'match')
    expect(result).not.toBeNull()
    expect(result?.before).toBe('')
    expect(result?.match).toBe('match')
  })

  it('should handle match at end of text', () => {
    const result = highlightMatch('ending with match', 'match')
    expect(result).not.toBeNull()
    expect(result?.after).toBe('')
    expect(result?.match).toBe('match')
  })
})
