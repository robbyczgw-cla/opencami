import { describe, expect, it } from 'vitest'

import {
  getImageParts,
  mergeOptimisticHistoryMessages,
  restoreCachedImageParts,
} from '@/screens/chat/hooks/use-chat-history'
import type { GatewayMessage } from '@/screens/chat/types'

describe('use-chat-history helpers', () => {
  it('ignores image stubs without renderable data', () => {
    const message: GatewayMessage = {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
          },
        },
      ],
    }

    expect(getImageParts(message)).toHaveLength(0)
  })

  it('restores cached renderable images when history only returns stubs', () => {
    const cachedMessages: GatewayMessage[] = [
      {
        role: 'user',
        clientId: 'client-1',
        timestamp: 1_700_000_000_000,
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: 'abc123',
            },
          },
          { type: 'text', text: 'look at this' },
        ],
      },
    ]
    const serverMessages: GatewayMessage[] = [
      {
        role: 'user',
        clientId: 'client-1',
        timestamp: 1_700_000_001_000,
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
            },
          },
          { type: 'text', text: 'look at this' },
        ],
      },
    ]

    const restored = restoreCachedImageParts(serverMessages, cachedMessages)
    const image = restored[0]?.content?.[0]

    expect(image).toMatchObject({
      type: 'image',
      source: { data: 'abc123' },
    })
  })

  it('preserves optimistic markers and images on matched messages', () => {
    const optimisticMessages: GatewayMessage[] = [
      {
        role: 'user',
        clientId: 'client-2',
        __optimisticId: 'opt-2',
        timestamp: 1_700_000_000_000,
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: 'xyz789',
            },
          },
          { type: 'text', text: 'same text' },
        ],
      },
    ]
    const serverMessages: GatewayMessage[] = [
      {
        role: 'user',
        timestamp: 1_700_000_005_000,
        content: [{ type: 'text', text: 'same text' }],
      },
    ]

    const merged = mergeOptimisticHistoryMessages(
      serverMessages,
      optimisticMessages,
    )

    expect(merged[0]?.__optimisticId).toBe('opt-2')
    expect(merged[0]?.clientId).toBe('client-2')
    expect(merged[0]?.content?.[0]).toMatchObject({
      type: 'image',
      source: { data: 'xyz789' },
    })
  })
})
