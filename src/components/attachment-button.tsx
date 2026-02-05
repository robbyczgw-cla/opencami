'use client'

import { useRef, useCallback } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Attachment01Icon } from '@hugeicons/core-free-icons'
import * as pdfjsLib from 'pdfjs-dist'

import { Button } from '@/components/ui/button'

// Configure pdf.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
}

/** Maximum file size before compression (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Maximum dimension (width or height) for resized images */
const MAX_IMAGE_DIMENSION = 1280

/** Initial JPEG compression quality (0-1) */
const IMAGE_QUALITY = 0.75

/** 
 * Target compressed image size in bytes (~300KB).
 * WebSocket limit is 512KB, and base64 encoding adds ~33% overhead.
 */
const TARGET_IMAGE_SIZE = 300 * 1024

/** Scale factor for rendering PDF pages (higher = better quality but larger) */
const PDF_RENDER_SCALE = 2.0

/** Supported image MIME types */
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

/** File extensions accepted by the file input */
const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.gif,.webp,.pdf'

/**
 * Represents a file attachment ready to be sent with a message.
 */
export type AttachmentFile = {
  /** Unique identifier for the attachment */
  id: string
  /** Original file reference */
  file: File
  /** Object URL for image preview (null for non-images) */
  preview: string | null
  /** Attachment type */
  type: 'image'
  /** Base64-encoded file content (without data URL prefix) */
  base64: string | null
  /** Error message if processing failed */
  error?: string
}

type AttachmentButtonProps = {
  /** Callback when a file is selected */
  onFileSelect: (file: AttachmentFile) => void
  /** Whether the button is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Checks if Canvas API is available in the current environment.
 * @returns true if canvas is supported
 */
function isCanvasSupported(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext && canvas.getContext('2d'))
  } catch {
    return false
  }
}

/**
 * Compresses and resizes an image using the Canvas API.
 * 
 * - Resizes images larger than MAX_IMAGE_DIMENSION
 * - Converts to JPEG (except PNG which may have transparency)
 * - Progressively reduces quality until under TARGET_IMAGE_SIZE
 * 
 * @param file - Image file to compress
 * @returns Base64-encoded compressed image (without data URL prefix)
 * @throws Error if canvas is unavailable or image fails to load
 */
async function compressImage(file: File): Promise<string> {
  if (!isCanvasSupported()) {
    throw new Error('Image compression not available in this browser')
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }

    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
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
          cleanup()
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        // Use PNG for images that might have transparency, JPEG otherwise
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        let quality = IMAGE_QUALITY
        
        // Progressive quality reduction for JPEG
        let dataUrl = canvas.toDataURL(outputType, quality)
        
        if (outputType === 'image/jpeg') {
          // Account for base64 overhead (~37% larger than binary)
          const targetDataUrlSize = TARGET_IMAGE_SIZE * 1.37
          while (dataUrl.length > targetDataUrlSize && quality > 0.3) {
            quality -= 0.1
            dataUrl = canvas.toDataURL(outputType, quality)
          }
        }
        
        // Extract base64 from data URL (remove "data:image/...;base64," prefix)
        const base64 = dataUrl.split(',')[1]
        if (!base64) {
          cleanup()
          reject(new Error('Failed to encode image'))
          return
        }

        cleanup()
        resolve(base64)
      } catch (err) {
        cleanup()
        reject(err instanceof Error ? err : new Error('Image compression failed'))
      }
    }
    
    img.onerror = () => {
      cleanup()
      reject(new Error('Failed to load image'))
    }
    
    img.src = objectUrl
  })
}

/**
 * Compresses a canvas to JPEG with progressive quality reduction.
 * 
 * @param canvas - Canvas element to compress
 * @returns Base64-encoded JPEG (without data URL prefix)
 */
function compressCanvas(canvas: HTMLCanvasElement): string {
  let quality = IMAGE_QUALITY
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  
  // Progressive quality reduction until under target size
  const targetDataUrlSize = TARGET_IMAGE_SIZE * 1.37
  while (dataUrl.length > targetDataUrlSize && quality > 0.3) {
    quality -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  
  const base64 = dataUrl.split(',')[1]
  if (!base64) {
    throw new Error('Failed to encode image')
  }
  
  return base64
}

/**
 * Renders a PDF file to images using pdf.js.
 * Converts the first page to a JPEG image.
 * 
 * @param file - PDF file to render
 * @returns Base64-encoded JPEG of the first page
 * @throws Error if PDF loading or rendering fails
 */
async function renderPdfToImage(file: File): Promise<string> {
  if (!isCanvasSupported()) {
    throw new Error('PDF rendering not available in this browser')
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  // Render first page only (multi-page PDFs would need multiple attachments)
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })
  
  // Create canvas for rendering
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  
  // Render PDF page to canvas
  await page.render({
    canvasContext: ctx,
    viewport: viewport,
    canvas: canvas,
  }).promise
  
  // Resize if needed (PDF pages can be very large)
  let finalCanvas = canvas
  if (canvas.width > MAX_IMAGE_DIMENSION || canvas.height > MAX_IMAGE_DIMENSION) {
    finalCanvas = document.createElement('canvas')
    let width = canvas.width
    let height = canvas.height
    
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width)
      width = MAX_IMAGE_DIMENSION
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height)
      height = MAX_IMAGE_DIMENSION
    }
    
    finalCanvas.width = width
    finalCanvas.height = height
    
    const finalCtx = finalCanvas.getContext('2d')
    if (!finalCtx) {
      throw new Error('Failed to get canvas context for resizing')
    }
    
    finalCtx.drawImage(canvas, 0, 0, width, height)
  }
  
  return compressCanvas(finalCanvas)
}

/**
 * Checks if a file is a supported image type.
 * @param file - File to check
 * @returns true if the file is a supported image
 */
function isAcceptedImage(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type)
}

/**
 * Checks if a file is a PDF.
 * @param file - File to check
 * @returns true if the file is a PDF
 */
function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/**
 * Button component for attaching files to messages.
 * 
 * Features:
 * - Accepts PNG, JPG, GIF, WebP images and PDF files
 * - Automatically compresses and resizes large images
 * - Converts PDF pages to images using pdf.js
 * - Generates preview URLs for selected files
 * - Handles errors gracefully with user-friendly messages
 */
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

      // Reset input to allow selecting the same file again
      event.target.value = ''

      const id = crypto.randomUUID()
      const isImage = isAcceptedImage(file)
      const isPdfFile = isPdf(file)

      // Validate file type
      if (!isImage && !isPdfFile) {
        onFileSelect({
          id,
          file,
          preview: null,
          type: 'image',
          base64: null,
          error: 'Unsupported file type. Please use PNG, JPG, GIF, WebP images, or PDF files.',
        })
        return
      }

      // Validate file size (before compression)
      if (file.size > MAX_FILE_SIZE) {
        onFileSelect({
          id,
          file,
          preview: null,
          type: 'image',
          base64: null,
          error: 'File is too large. Maximum size is 10MB.',
        })
        return
      }

      try {
        let base64: string
        let preview: string | null = null

        if (isPdfFile) {
          // Convert PDF to image
          base64 = await renderPdfToImage(file)
          // Create a preview from the base64 data
          preview = `data:image/jpeg;base64,${base64}`
        } else {
          // Compress image
          base64 = await compressImage(file)
          preview = URL.createObjectURL(file)
        }

        onFileSelect({
          id,
          file,
          preview,
          type: 'image',
          base64,
        })
      } catch (err) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : isPdfFile ? 'Failed to process PDF' : 'Failed to process image'
        
        onFileSelect({
          id,
          file,
          preview: null,
          type: 'image',
          base64: null,
          error: errorMessage,
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
