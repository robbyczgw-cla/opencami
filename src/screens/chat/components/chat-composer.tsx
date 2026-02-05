import { memo, useCallback, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUp02Icon } from '@hugeicons/core-free-icons'
import type { Ref } from 'react'

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/model-selector'
import { CommandHelp } from '@/components/command-help'
import { AttachmentButton, type AttachmentFile } from '@/components/attachment-button'
import { AttachmentPreviewList } from '@/components/attachment-preview'

type ChatComposerProps = {
  onSubmit: (value: string, helpers: ChatComposerHelpers) => void
  isLoading: boolean
  disabled: boolean
  wrapperRef?: Ref<HTMLDivElement>
  inputRef?: Ref<HTMLTextAreaElement>
}

type ChatComposerHelpers = {
  reset: () => void
  setValue: (value: string) => void
  model?: string
  attachments?: AttachmentFile[]
}

function ChatComposerComponent({
  onSubmit,
  isLoading,
  disabled,
  wrapperRef,
  inputRef: externalInputRef,
}: ChatComposerProps) {
  const [value, setValue] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  
  // Sync internal ref with external ref if provided
  const setPromptRef = useCallback(
    (element: HTMLTextAreaElement | null) => {
      promptRef.current = element
      if (externalInputRef) {
        if (typeof externalInputRef === 'function') {
          externalInputRef(element)
        } else {
          ;(externalInputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = element
        }
      }
    },
    [externalInputRef],
  )
  
  const focusPrompt = useCallback(() => {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      promptRef.current?.focus()
    })
  }, [])
  const reset = useCallback(() => {
    setValue('')
    setAttachments([])
    focusPrompt()
  }, [focusPrompt])
  const handleFileSelect = useCallback((file: AttachmentFile) => {
    setAttachments((prev) => [...prev, file])
  }, [])
  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])
  const setComposerValue = useCallback(
    (nextValue: string) => {
      setValue(nextValue)
      focusPrompt()
    },
    [focusPrompt],
  )
  const handleSubmit = useCallback(() => {
    if (disabled) return
    const body = value.trim()
    // Allow submit if there's text OR valid attachments
    const validAttachments = attachments.filter((a) => !a.error && a.base64)
    if (body.length === 0 && validAttachments.length === 0) return
    onSubmit(body, { reset, setValue: setComposerValue, model: selectedModel, attachments: validAttachments })
    focusPrompt()
  }, [disabled, focusPrompt, onSubmit, reset, setComposerValue, value, selectedModel, attachments])
  const validAttachments = attachments.filter((a) => !a.error && a.base64)
  const submitDisabled = disabled || (value.trim().length === 0 && validAttachments.length === 0)

  return (
    <div
      className="mx-auto w-full max-w-full px-5 sm:max-w-[768px] sm:min-w-[400px] relative pb-3"
      ref={wrapperRef}
    >
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        disabled={disabled}
      >
        <AttachmentPreviewList
          attachments={attachments}
          onRemove={handleRemoveAttachment}
        />
        <PromptInputTextarea
          placeholder="Type a message…"
          inputRef={setPromptRef}
        />
        <PromptInputActions className="justify-between px-3">
          <div className="flex items-center gap-1">
            <ModelSelector onModelChange={setSelectedModel} />
            <CommandHelp onCommandSelect={(cmd) => setValue(cmd + ' ')} />
          </div>
          <div className="flex items-center gap-1">
            <PromptInputAction tooltip="Attach file">
              <AttachmentButton
                onFileSelect={handleFileSelect}
                disabled={disabled}
              />
            </PromptInputAction>
            <PromptInputAction tooltip="Send message">
              <Button
                onClick={handleSubmit}
                disabled={submitDisabled}
                size="icon-sm"
                className="rounded-full"
                aria-label="Send message"
              >
                <HugeiconsIcon icon={ArrowUp02Icon} size={18} strokeWidth={2} />
              </Button>
            </PromptInputAction>
          </div>
        </PromptInputActions>
      </PromptInput>
    </div>
  )
}

const MemoizedChatComposer = memo(ChatComposerComponent)

export { MemoizedChatComposer as ChatComposer }
export type { ChatComposerHelpers }
