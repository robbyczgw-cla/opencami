import { describe, expect, it, vi } from 'vitest'
import { ACCEPTED_IMAGE_TYPES } from '@/components/attachment-button'

describe('attachment-button constants', () => {
  describe('ACCEPTED_IMAGE_TYPES', () => {
    it('should include common image formats', () => {
      expect(ACCEPTED_IMAGE_TYPES).toContain('image/png')
      expect(ACCEPTED_IMAGE_TYPES).toContain('image/jpeg')
      expect(ACCEPTED_IMAGE_TYPES).toContain('image/gif')
      expect(ACCEPTED_IMAGE_TYPES).toContain('image/webp')
    })

    it('should have exactly 4 supported types', () => {
      expect(ACCEPTED_IMAGE_TYPES.length).toBe(4)
    })
  })
})

// Note: compressImage requires Canvas API which is complex to mock in jsdom
// These tests would be better as integration tests or with a canvas mock library
describe('image compression (unit tests)', () => {
  it('should have compressImage function exported', async () => {
    const { compressImage } = await import('@/components/attachment-button')
    expect(typeof compressImage).toBe('function')
  })

  it('should reject in non-canvas environment', async () => {
    const { compressImage } = await import('@/components/attachment-button')
    
    // jsdom doesn't have proper Canvas support, so this should reject
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    
    await expect(compressImage(file)).rejects.toThrow('Image compression not available')
  })
})
