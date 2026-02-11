import { describe, expect, it } from 'vitest'
import {
  deriveFriendlyIdFromKey,
  textFromMessage,
  getToolCallsFromMessage,
  findToolResultForCall,
  getMessageTimestamp,
  isProtectedSession,
  normalizeSessions,
  isMissingGatewayAuth,
  missingGatewayAuthMessage,
} from '@/screens/chat/utils'
import type { GatewayMessage, SessionSummary } from '@/screens/chat/types'

describe('chat-screen-utils', () => {
  describe('deriveFriendlyIdFromKey', () => {
    it('should return main for empty/undefined key', () => {
      expect(deriveFriendlyIdFromKey(undefined)).toBe('main')
      expect(deriveFriendlyIdFromKey('')).toBe('main')
      expect(deriveFriendlyIdFromKey('   ')).toBe('main')
    })

    it('should extract last segment from colon-separated key', () => {
      expect(deriveFriendlyIdFromKey('agent:main:session123')).toBe('session123')
      expect(deriveFriendlyIdFromKey('agent:main:telegram:chat')).toBe('chat')
    })

    it('should return full key if no colons', () => {
      expect(deriveFriendlyIdFromKey('session123')).toBe('session123')
    })

    it('should handle trailing whitespace', () => {
      expect(deriveFriendlyIdFromKey('agent:main:session  ')).toBe('session')
    })
  })

  describe('textFromMessage', () => {
    it('should extract text content from message', () => {
      const msg: GatewayMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello world' }],
      }
      expect(textFromMessage(msg)).toBe('Hello world')
    })

    it('should concatenate multiple text parts', () => {
      const msg: GatewayMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: ' world' },
        ],
      }
      // Function joins parts with empty string, not newline
      expect(textFromMessage(msg)).toBe('Hello world')
    })

    it('should ignore non-text content', () => {
      const msg: GatewayMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'toolCall', id: 'tool1', name: 'read' },
        ],
      }
      expect(textFromMessage(msg)).toBe('Hello')
    })

    it('should return empty string for empty content', () => {
      const msg: GatewayMessage = { role: 'assistant', content: [] }
      expect(textFromMessage(msg)).toBe('')
    })

    it('should handle undefined content', () => {
      const msg: GatewayMessage = { role: 'assistant' }
      expect(textFromMessage(msg)).toBe('')
    })
  })

  describe('getToolCallsFromMessage', () => {
    it('should extract tool calls from message', () => {
      const msg: GatewayMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Let me check' },
          { type: 'toolCall', id: 'tool1', name: 'read' },
          { type: 'toolCall', id: 'tool2', name: 'write' },
        ],
      }
      const calls = getToolCallsFromMessage(msg)
      expect(calls.length).toBe(2)
      expect(calls[0].name).toBe('read')
      expect(calls[1].name).toBe('write')
    })

    it('should return empty array if no tool calls', () => {
      const msg: GatewayMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
      }
      expect(getToolCallsFromMessage(msg)).toEqual([])
    })
  })

  describe('findToolResultForCall', () => {
    it('should find matching tool result', () => {
      const messages: GatewayMessage[] = [
        { role: 'assistant', content: [{ type: 'toolCall', id: 'tool1', name: 'read' }] },
        { role: 'toolResult', toolCallId: 'tool1', content: [{ type: 'text', text: 'result' }] },
      ]
      const result = findToolResultForCall('tool1', messages)
      expect(result).toBeDefined()
      expect(result?.toolCallId).toBe('tool1')
    })

    it('should return undefined if no match', () => {
      const messages: GatewayMessage[] = [
        { role: 'assistant', content: [{ type: 'text', text: 'Hello' }] },
      ]
      expect(findToolResultForCall('nonexistent', messages)).toBeUndefined()
    })
  })

  describe('getMessageTimestamp', () => {
    it('should extract timestamp from message', () => {
      const msg: GatewayMessage = { role: 'user', timestamp: 1700000000000 }
      expect(getMessageTimestamp(msg)).toBe(1700000000000)
    })

    it('should convert seconds to milliseconds', () => {
      const msg: GatewayMessage = { role: 'user', timestamp: 1700000000 }
      expect(getMessageTimestamp(msg)).toBe(1700000000000)
    })

    it('should parse ISO date strings', () => {
      const msg = { role: 'user', createdAt: '2024-01-01T00:00:00Z' } as GatewayMessage
      const ts = getMessageTimestamp(msg)
      expect(ts).toBe(new Date('2024-01-01T00:00:00Z').getTime())
    })

    it('should return current time for missing timestamp', () => {
      const before = Date.now()
      const msg: GatewayMessage = { role: 'user' }
      const ts = getMessageTimestamp(msg)
      const after = Date.now()
      expect(ts).toBeGreaterThanOrEqual(before)
      expect(ts).toBeLessThanOrEqual(after)
    })
  })

  describe('isProtectedSession', () => {
    it('should protect main sessions', () => {
      expect(isProtectedSession('agent:main:main')).toBe(true)
      expect(isProtectedSession('main')).toBe(true)
    })

    it('should not protect other sessions', () => {
      expect(isProtectedSession('agent:main:session123')).toBe(false)
      expect(isProtectedSession('agent:main:telegram:chat')).toBe(false)
    })
  })

  describe('normalizeSessions', () => {
    it('should normalize session list', () => {
      const sessions: SessionSummary[] = [
        { key: 'agent:main:session1', title: 'Chat 1' },
        { key: 'agent:main:session2', title: 'Chat 2' },
      ]
      const normalized = normalizeSessions(sessions)
      expect(normalized.length).toBe(2)
      expect(normalized[0].key).toBe('agent:main:session1')
      expect(normalized[0].friendlyId).toBe('session1')
    })

    it('should derive session kind correctly', () => {
      const sessions: SessionSummary[] = [
        { key: 'agent:main:subagent:abc123' },
        { key: 'isolated:cron:daily' },
        { key: 'agent:main:abc12345-1234-1234-1234-123456789012' },
        { key: 'agent:tefy:main' },
      ]
      const normalized = normalizeSessions(sessions)
      expect(normalized[0].kind).toBe('subagent')
      expect(normalized[1].kind).toBe('cron')
      expect(normalized[2].kind).toBe('webchat')
      expect(normalized[3].kind).toBe('other')
    })

    it('should handle empty/undefined input', () => {
      expect(normalizeSessions(undefined)).toEqual([])
      expect(normalizeSessions([])).toEqual([])
    })

    it('should extract token counts from raw session', () => {
      const sessions = [
        { key: 'session1', totalTokens: 1000, contextTokens: 500 },
      ] as unknown as SessionSummary[]
      const normalized = normalizeSessions(sessions)
      expect(normalized[0].totalTokens).toBe(1000)
      expect(normalized[0].contextTokens).toBe(500)
    })
  })

  describe('isMissingGatewayAuth', () => {
    it('should detect missing gateway auth message', () => {
      expect(isMissingGatewayAuth(missingGatewayAuthMessage)).toBe(true)
      expect(isMissingGatewayAuth(`Error: ${missingGatewayAuthMessage}`)).toBe(true)
    })

    it('should return false for other messages', () => {
      expect(isMissingGatewayAuth('Connection failed')).toBe(false)
      expect(isMissingGatewayAuth('Unknown error')).toBe(false)
    })
  })
})
