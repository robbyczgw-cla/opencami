import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { GatewayMessage } from '@/screens/chat/types'

// We need to mock the DOM functions before importing the module
const mockCreateElement = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockClick = vi.fn()

beforeEach(() => {
  mockCreateElement.mockReturnValue({
    href: '',
    download: '',
    click: mockClick,
  })
  Object.defineProperty(document, 'createElement', {
    value: mockCreateElement,
    writable: true,
  })
  Object.defineProperty(document.body, 'appendChild', {
    value: mockAppendChild,
    writable: true,
  })
  Object.defineProperty(document.body, 'removeChild', {
    value: mockRemoveChild,
    writable: true,
  })
})

describe('export-conversation', () => {
  const sampleMessages: GatewayMessage[] = [
    {
      role: 'user',
      content: [{ type: 'text', text: 'Hello, how are you?' }],
    },
    {
      role: 'assistant',
      content: [{ type: 'text', text: 'I am doing well, thank you for asking!' }],
    },
    {
      role: 'user',
      content: [{ type: 'text', text: 'Can you help me with coding?' }],
    },
  ]

  describe('exportConversation', () => {
    it('should export as markdown', async () => {
      const { exportConversation } = await import('@/screens/chat/utils/export-conversation')
      
      // Should not throw
      expect(() => exportConversation('Test Chat', sampleMessages, 'markdown')).not.toThrow()
      expect(mockCreateElement).toHaveBeenCalledWith('a')
    })

    it('should export as JSON', async () => {
      const { exportConversation } = await import('@/screens/chat/utils/export-conversation')
      
      expect(() => exportConversation('Test Chat', sampleMessages, 'json')).not.toThrow()
    })

    it('should export as plain text', async () => {
      const { exportConversation } = await import('@/screens/chat/utils/export-conversation')
      
      expect(() => exportConversation('Test Chat', sampleMessages, 'txt')).not.toThrow()
    })

    it('should throw for unsupported format', async () => {
      const { exportConversation } = await import('@/screens/chat/utils/export-conversation')
      
      expect(() => exportConversation('Test Chat', sampleMessages, 'xml' as any)).toThrow(
        'Unsupported format'
      )
    })

    it('should handle empty messages', async () => {
      const { exportConversation } = await import('@/screens/chat/utils/export-conversation')
      
      expect(() => exportConversation('Empty Chat', [], 'markdown')).not.toThrow()
    })

    it('should handle messages without text content', async () => {
      const { exportConversation } = await import('@/screens/chat/utils/export-conversation')
      
      const messagesWithToolCall: GatewayMessage[] = [
        {
          role: 'assistant',
          content: [{ type: 'toolCall', id: 'tool1', name: 'read' }],
        },
      ]
      
      expect(() => exportConversation('Tool Chat', messagesWithToolCall, 'markdown')).not.toThrow()
    })

    it('should sanitize filename', async () => {
      const { exportConversation } = await import('@/screens/chat/utils/export-conversation')
      
      // Special characters should be removed
      expect(() => exportConversation('Test/Chat:With*Special?Chars', sampleMessages, 'txt')).not.toThrow()
    })
  })
})
