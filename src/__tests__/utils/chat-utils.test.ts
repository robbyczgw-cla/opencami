import { describe, expect, it } from 'vitest'

import { stripInboundMeta, textFromMessage } from '@/screens/chat/utils'
import type { GatewayMessage } from '@/screens/chat/types'

describe('chat utils', () => {
  describe('stripInboundMeta', () => {
    it('removes conversation metadata and timestamp prefix', () => {
      const input = [
        'Conversation info (untrusted metadata):',
        '```json',
        '{"channel":"telegram"}',
        '```',
        '[Tue 2026-03-10 12:05 GMT+4] hello there',
      ].join('\n')

      expect(stripInboundMeta(input)).toBe('hello there')
    })

    it('removes injected supermemory, workspace rules, and sender metadata blocks', () => {
      const input = [
        '<supermemory-context>secret context</supermemory-context>',
        'Sender (untrusted metadata):',
        '```text',
        '{"sessionKey":"agent:main:main"}',
        '```',
        '<supermemory-containers>container dump</supermemory-containers>',
        '<workspace-critical-rules>never show this</workspace-critical-rules>',
        '[Tue 2026-03-10 12:05 GMT+4] actual user message',
      ].join('\n')

      expect(stripInboundMeta(input)).toBe('actual user message')
    })

    it('keeps normal message content intact', () => {
      expect(stripInboundMeta('Meet me at [Tue 2026-03-10 12:05 GMT+4] maybe?')).toBe(
        'Meet me at [Tue 2026-03-10 12:05 GMT+4] maybe?',
      )
    })
  })

  describe('textFromMessage', () => {
    it('returns cleaned text content from a gateway message', () => {
      const message: GatewayMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '<supermemory-context>hidden</supermemory-context>\nreal text',
          },
        ],
      }

      expect(textFromMessage(message)).toBe('real text')
    })
  })
})
