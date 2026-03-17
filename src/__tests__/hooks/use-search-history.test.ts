import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEntireHistory, hasSufficientCachedHistory } from '@/hooks/use-search'
import { fetchHistory } from '@/screens/chat/chat-queries'

vi.mock('@/screens/chat/chat-queries', async () => {
  return {
    chatQueryKeys: {
      history: (friendlyId: string, sessionKey: string) => [
        'chat',
        'history',
        friendlyId,
        sessionKey,
      ],
    },
    fetchHistory: vi.fn(),
  }
})

describe('use-search history helpers', () => {
  const mockedFetchHistory = vi.mocked(fetchHistory)

  beforeEach(() => {
    mockedFetchHistory.mockReset()
  })

  it('requires the full-search threshold before reusing a complete cache', () => {
    expect(hasSufficientCachedHistory([{ id: 'm1' } as any], false, true)).toBe(false)
    expect(
      hasSufficientCachedHistory(
        Array.from({ length: 200 }, (_, index) => ({ id: `m${index}` } as any)),
        false,
        true,
      ),
    ).toBe(true)
  })

  it('breaks full-history fetches when a page adds nothing new', async () => {
    mockedFetchHistory.mockResolvedValue({
      sessionKey: 'session',
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: [{ type: 'text', text: 'hello' }],
        } as any,
      ],
      hasMore: true,
    })

    const result = await fetchEntireHistory({
      friendlyId: 'friendly',
      sessionKey: 'session',
      signal: new AbortController().signal,
    })

    expect(mockedFetchHistory).toHaveBeenCalledTimes(2)
    expect(result.messages).toHaveLength(1)
    expect(result.hasMore).toBe(false)
  })

  it('caps full-history fetches after 20 pages', async () => {
    let counter = 0
    mockedFetchHistory.mockImplementation(async () => {
      counter += 1
      return {
        sessionKey: 'session',
        messages: [
          {
            id: `m${counter}`,
            role: 'user',
            content: [{ type: 'text', text: `message ${counter}` }],
          } as any,
        ],
        hasMore: true,
      }
    })

    const result = await fetchEntireHistory({
      friendlyId: 'friendly',
      sessionKey: 'session',
      signal: new AbortController().signal,
    })

    expect(mockedFetchHistory).toHaveBeenCalledTimes(20)
    expect(result.messages).toHaveLength(20)
    expect(result.hasMore).toBe(false)
  })
})
