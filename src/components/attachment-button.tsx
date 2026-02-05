'use client'

import { useRef, useCallback } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Attachment01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB for images (will be compressed)
const MAX_DOC_SIZE = 1 * 1024 * 1024 // 1MB for documents (no compression)
const MAX_IMAGE_DIMENSION = 1920 // Max width or height for images
const IMAGE_QUALITY = 0.85 // JPEG quality (0-1)
const TARGET_IMAGE_SIZE = 500 * 1024 // Target ~500KB for images

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const ACCEPTED_DOC_TYPES = ['application/pdf', 'text/plain', 'text/markdown']
const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md'

export type AttachmentFile = {
  id: string
  file: File
  preview: string | null
  type: 'image' | 'document'
  base64: string | null
  error?: string
}

type AttachmentButtonProps = {
  onFileSelect: (file: AttachmentFile) => void
  disabled?: boolean
  className?: string
}

/**
 * Compress and resize an image using Canvas
 * Returns base64 string (without data URL prefix)
 */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Calculate new dimensions
      let width = img.width
      let height = img.height
      
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width)
          width = MAX_IMAGE_DIMENSION
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height)
          height = MAX_IMAGE_DIMENSION
        }
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      ctx.drawImage(img, 0, 0, width, height)
      
      // Convert to JPEG for better compression (unless it's a PNG with transparency)
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      let quality = IMAGE_QUALITY
      
      // Try to get the image under target size with progressive quality reduction
      let dataUrl = canvas.toDataURL(outputType, quality)
      
      // If still too large and it's not PNG, reduce quality
      if (outputType === 'image/jpeg') {
        while (dataUrl.length > TARGET_IMAGE_SIZE * 1.37 && quality > 0.3) {
          quality -= 0.1
          dataUrl = canvas.toDataURL(outputType, quality)
        }
      }
      
      // Extract base64 from data URL
      const base64 = dataUrl.split(',')[1]
      resolve(base64)
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Extract base64 data after the data URL prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getFileType(file: File): 'image' | 'document' | null {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'image'
  }
  if (ACCEPTED_DOC_TYPES.includes(file.type)) {
    return 'document'
  }
  // Check by extension for markdown files
  if (file.name.endsWith('.md')) {
    return 'document'
  }
  return null
}

export function AttachmentButton({
  onFileSelect,
  disabled = false,
  className,
}: AttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Reset the input so the same file can be selected again
      event.target.value = ''

      const fileType = getFileType(file)
      const id = crypto.randomUUID()

      if (!fileType) {
        onFileSelect({
          id,
          file,
          preview: null,
          type: 'document',
          base64: null,
          error: 'Unsupported file type. Please use PNG, JPG, GIF, WebP, PDF, TXT, or MD.',
        })
        return
      }

      // Different size limits: images get compressed, documents don't
      const maxSize = fileType === 'image' ? MAX_FILE_SIZE : MAX_DOC_SIZE
      const maxSizeLabel = fileType === 'image' ? '10MB' : '1MB'
      
      if (file.size > maxSize) {
        onFileSelect({
          id,
          file,
          preview: null,
          type: fileType,
          base64: null,
          error: `File is too large. Maximum size for ${fileType}s is ${maxSizeLabel}.`,
        })
        return
      }

      try {
        // Compress images, read documents as-is
        const base64 = fileType === 'image' 
          ? await compressImage(file)
          : await fileToBase64(file)
          
        const preview = fileType === 'image' ? URL.createObjectURL(file) : null

        onFileSelect({
          id,
          file,
          preview,
          type: fileType,
          base64,
        })
      } catch {
        onFileSelect({
          id,
          file,
          preview: null,
          type: fileType,
          base64: null,
          error: 'Failed to process file.',
        })
      }
    },
    [onFileSelect],
  )

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleClick}
        disabled={disabled}
        className={className}
        aria-label="Attach file"
        type="button"
      >
        <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={1.8} />
      </Button>
    </>
  )
}
