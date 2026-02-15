'use client'

import { useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, File01Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AttachmentFile } from './attachment-button'

type AttachmentPreviewProps = {
  attachment: AttachmentFile
  onRemove: (id: string) => void
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()?.toUpperCase() || '' : ''
}

export function AttachmentPreview({
  attachment,
  onRemove,
  className,
}: AttachmentPreviewProps) {
  useEffect(() => {
    return () => {
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview)
      }
    }
  }, [attachment.preview])

  const hasError = Boolean(attachment.error)

  if (attachment.type === 'file' && !hasError) {
    return (
      <div
        className={cn(
          'inline-flex max-w-full items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs text-primary-800',
          className,
        )}
      >
        <span className="truncate">📄 {attachment.file.name} ({formatFileSize(attachment.file.size)})</span>
        <button
          onClick={() => onRemove(attachment.id)}
          className="shrink-0 text-primary-500 hover:text-primary-800"
          aria-label="Remove attachment"
          type="button"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-xl border p-2 pr-3',
        hasError
          ? 'border-red-300 bg-red-50'
          : 'border-primary-200 bg-primary-50',
        className,
      )}
    >
      <div className="relative shrink-0">
        {attachment.type === 'image' && attachment.preview ? (
          <img
            src={attachment.preview}
            alt={attachment.file.name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
            <HugeiconsIcon
              icon={File01Icon}
              size={24}
              className="text-primary-500"
            />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary-900">
          {attachment.file.name}
        </p>
        {hasError ? (
          <p className="text-xs text-red-600">{attachment.error}</p>
        ) : (
          <p className="text-xs text-primary-500">
            {getFileExtension(attachment.file.name)} •{' '}
            {formatFileSize(attachment.file.size)}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(attachment.id)}
        className="h-6 w-6 shrink-0 rounded-full hover:bg-primary-200"
        aria-label="Remove attachment"
        type="button"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={14} />
      </Button>
    </div>
  )
}

type AttachmentPreviewListProps = {
  attachments: AttachmentFile[]
  onRemove: (id: string) => void
  className?: string
}

export function AttachmentPreviewList({
  attachments,
  onRemove,
  className,
}: AttachmentPreviewListProps) {
  if (attachments.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2 px-4', className)}>
      {attachments.map((attachment) => (
        <AttachmentPreview
          key={attachment.id}
          attachment={attachment}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
