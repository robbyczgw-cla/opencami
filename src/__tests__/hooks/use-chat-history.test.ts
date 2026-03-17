import { describe, expect, it } from 'vitest'
import { normalizeHistoryPage } from '@/screens/chat/hooks/use-chat-history'

describe('normalizeHistoryPage', () => {
  it('preserves hasMore when the API already inferred an exact-limit extra page', () => {
    const messages = Array.from({ length: 50 }, (_, index) => ({ id: `m${index}` }))

    const result = normalizeHistoryPage(
      {
        sessionKey: 'session',
        messages: messages as any,
        hasMore: true,
      },
      50,
    )

    expect(result.messages).toHaveLength(50)
    expect(result.hasMore).toBe(true)
  })

  it('trims the extra record while keeping hasMore true', () => {
    const messages = Array.from({ length: 51 }, (_, index) => ({ id: `m${index}` }))

    const result = normalizeHistoryPage(
      {
        sessionKey: 'session',
        messages: messages as any,
      },
      50,
    )

    expect(result.messages).toHaveLength(50)
    expect(result.messages[0]).toEqual({ id: 'm1' })
    expect(result.hasMore).toBe(true)
  })
})
