import { describe, expect, it } from 'vitest'
import { createOptimisticMessage } from '@/screens/chat/chat-screen-utils'
import type { AttachmentFile } from '@/components/attachment-button'

describe('chat-screen-utils - optimistic messages', () => {
  describe('createOptimisticMessage', () => {
    it('should create optimistic message with text', () => {
      const { clientId, optimisticId, optimisticMessage } = createOptimisticMessage('Hello world')

      expect(clientId).toBeDefined()
      expect(optimisticId).toMatch(/^opt-/)
      expect(optimisticMessage.role).toBe('user')
      expect(optimisticMessage.status).toBe('sending')
      expect(optimisticMessage.__optimisticId).toBe(optimisticId)

      const textContent = optimisticMessage.content?.find((c) => c.type === 'text')
      expect(textContent?.text).toBe('Hello world')
    })

    it('should create unique IDs for each call', () => {
      const msg1 = createOptimisticMessage('First')
      const msg2 = createOptimisticMessage('Second')

      expect(msg1.clientId).not.toBe(msg2.clientId)
      expect(msg1.optimisticId).not.toBe(msg2.optimisticId)
    })

    it('should include timestamp', () => {
      const before = Date.now()
      const { optimisticMessage } = createOptimisticMessage('Test')
      const after = Date.now()

      expect(optimisticMessage.timestamp).toBeGreaterThanOrEqual(before)
      expect(optimisticMessage.timestamp).toBeLessThanOrEqual(after)
    })

    it('should handle attachments', () => {
      const attachments: AttachmentFile[] = [
        {
          id: 'att1',
          file: new File([''], 'test.png', { type: 'image/png' }),
          type: 'image',
          base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
          previewUrl: 'blob:test',
        },
      ]

      const { optimisticMessage } = createOptimisticMessage('Image message', attachments)

      // Should have image content before text
      const imageContent = optimisticMessage.content?.find((c) => c.type === 'image')
      expect(imageContent).toBeDefined()
      expect((imageContent as any).source?.type).toBe('base64')
      expect((imageContent as any).source?.media_type).toBe('image/png')
    })

    it('should handle empty text with attachments', () => {
      const attachments: AttachmentFile[] = [
        {
          id: 'att1',
          file: new File([''], 'test.png', { type: 'image/png' }),
          type: 'image',
          base64: 'base64data',
          previewUrl: 'blob:test',
        },
      ]

      const { optimisticMessage } = createOptimisticMessage('', attachments)

      // Should still have content array
      expect(optimisticMessage.content?.length).toBeGreaterThan(0)
    })

    it('should handle whitespace-only text', () => {
      const { optimisticMessage } = createOptimisticMessage('   ')

      // Text should be included but empty after trim check
      const textContent = optimisticMessage.content?.find((c) => c.type === 'text')
      expect(textContent).toBeUndefined()
    })
  })
})
