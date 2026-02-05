'use client'

import { useRef, useCallback } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Attachment01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
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

      if (file.size > MAX_FILE_SIZE) {
        onFileSelect({
          id,
          file,
          preview: null,
          type: fileType,
          base64: null,
          error: 'File is too large. Maximum size is 10MB.',
        })
        return
      }

      try {
        const base64 = await fileToBase64(file)
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
          error: 'Failed to read file.',
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
