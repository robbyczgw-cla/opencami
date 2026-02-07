import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUp02Icon } from '@hugeicons/core-free-icons'
import type { KeyboardEvent, MutableRefObject, Ref } from 'react'

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/prompt-kit/prompt-input'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/model-selector'
import { PersonaPicker } from '@/components/persona-picker'
import { CommandHelp } from '@/components/command-help'
import { AttachmentButton, type AttachmentFile } from '@/components/attachment-button'
import { AttachmentPreviewList } from '@/components/attachment-preview'
import { SlashCommandMenu, type SlashCommand } from './slash-command-menu'

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
  attachments?: Array<AttachmentFile>
}

const FALLBACK_SLASH_COMMANDS: Array<SlashCommand> = [
  { command: '/haiku', description: 'Switch to Claude Haiku 4.5' },
  { command: '/sonnet', description: 'Switch to Claude Sonnet 4.5' },
  { command: '/opus', description: 'Switch to Claude Opus 4.5' },
  { command: '/opus46', description: 'Switch to Claude Opus 4.6' },
  { command: '/codex', description: 'Switch to GPT 5.3 Codex' },
  { command: '/glm', description: 'Switch to GLM 4.7' },
  { command: '/kimi', description: 'Switch to Kimi K2.5' },
  { command: '/minimax', description: 'Switch to MiniMax M2.1' },
  { command: '/grok', description: 'Switch to Grok 4.1 Fast' },
  { command: '/new', description: 'New chat' },
  { command: '/reset', description: 'Reset session' },
  { command: '/status', description: 'Show status' },
  { command: '/reasoning', description: 'Toggle reasoning mode' },
  { command: '/followups', description: 'Show follow-up suggestions' },
]

function ChatComposerComponent({
  onSubmit,
  isLoading,
  disabled,
  wrapperRef,
  inputRef: externalInputRef,
}: ChatComposerProps) {
  const [value, setValue] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [attachments, setAttachments] = useState<Array<AttachmentFile>>([])
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [slashMenuDismissed, setSlashMenuDismissed] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement | null>(null)

  const showSlashCommands = useMemo(() => /^\/\S*$/.test(value) && !slashMenuDismissed, [value, slashMenuDismissed])
  const slashQuery = useMemo(() => (showSlashCommands ? value.slice(1).toLowerCase() : ''), [showSlashCommands, value])
  const filteredSlashCommands = useMemo(() => {
    if (!showSlashCommands) return []
    if (!slashQuery) return FALLBACK_SLASH_COMMANDS
    return FALLBACK_SLASH_COMMANDS.filter((item) => item.command.slice(1).toLowerCase().startsWith(slashQuery))
  }, [showSlashCommands, slashQuery])
  
  // Sync internal ref with external ref if provided
  const setPromptRef = useCallback(
    (element: HTMLTextAreaElement | null) => {
      promptRef.current = element
      if (externalInputRef) {
        if (typeof externalInputRef === 'function') {
          externalInputRef(element)
        } else {
          ;(externalInputRef as MutableRefObject<HTMLTextAreaElement | null>).current = element
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
    setSelectedCommandIndex(0)
    setSlashMenuDismissed(false)
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
      setSelectedCommandIndex(0)
      setSlashMenuDismissed(false)
      focusPrompt()
    },
    [focusPrompt],
  )
  const handleValueChange = useCallback((nextValue: string) => {
    setValue(nextValue)
    setSelectedCommandIndex(0)
    setSlashMenuDismissed(false)
  }, [])
  const selectSlashCommand = useCallback(
    (command: SlashCommand) => {
      setValue(`${command.command} `)
      setSelectedCommandIndex(0)
      setSlashMenuDismissed(false)
      focusPrompt()
    },
    [focusPrompt],
  )
  const handleSubmit = useCallback(() => {
    if (disabled) return

    if (showSlashCommands && filteredSlashCommands.length > 0) {
      const nextIndex = Math.min(selectedCommandIndex, filteredSlashCommands.length - 1)
      selectSlashCommand(filteredSlashCommands[nextIndex])
      return
    }

    const body = value.trim()
    // Allow submit if there's text OR valid attachments
    const validAttachments = attachments.filter((a) => !a.error && a.base64)
    if (body.length === 0 && validAttachments.length === 0) return
    onSubmit(body, { reset, setValue: setComposerValue, model: selectedModel || undefined, attachments: validAttachments })
    focusPrompt()
  }, [
    disabled,
    showSlashCommands,
    filteredSlashCommands,
    selectedCommandIndex,
    selectSlashCommand,
    value,
    attachments,
    onSubmit,
    reset,
    setComposerValue,
    selectedModel,
    focusPrompt,
  ])
  const handlePersonaSelect = useCallback(
    (command: string) => {
      onSubmit(command, { reset, setValue: setComposerValue, model: selectedModel || undefined, attachments: [] })
      focusPrompt()
    },
    [focusPrompt, onSubmit, reset, setComposerValue, selectedModel],
  )
  const handleComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSlashCommands) return

      if (event.key === 'Escape') {
        event.preventDefault()
        setSlashMenuDismissed(true)
        setSelectedCommandIndex(0)
        return
      }

      if (filteredSlashCommands.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedCommandIndex((prev) => (prev + 1) % filteredSlashCommands.length)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedCommandIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length)
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        const nextIndex = Math.min(selectedCommandIndex, filteredSlashCommands.length - 1)
        selectSlashCommand(filteredSlashCommands[nextIndex])
      }
    },
    [showSlashCommands, filteredSlashCommands, selectedCommandIndex, selectSlashCommand],
  )
  const validAttachments = attachments.filter((a) => !a.error && a.base64)
  const submitDisabled = disabled || (value.trim().length === 0 && validAttachments.length === 0)

  return (
    <div
      className="mx-auto w-full max-w-full px-2 md:px-5 sm:max-w-[768px] sm:min-w-[400px] relative pb-1 md:pb-3"
      ref={wrapperRef}
    >
      <PromptInput
        value={value}
        onValueChange={handleValueChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        disabled={disabled}
      >
        <AttachmentPreviewList
          attachments={attachments}
          onRemove={handleRemoveAttachment}
        />
        {showSlashCommands && filteredSlashCommands.length > 0 && (
          <SlashCommandMenu
            commands={filteredSlashCommands}
            selectedIndex={Math.min(selectedCommandIndex, filteredSlashCommands.length - 1)}
            onSelect={selectSlashCommand}
          />
        )}
        <PromptInputTextarea
          placeholder="Type a message…"
          inputRef={setPromptRef}
          onKeyDown={handleComposerKeyDown}
        />
        <PromptInputActions className="justify-between px-3">
          <div className="flex items-center gap-1">
            <ModelSelector onModelChange={setSelectedModel} />
            <PersonaPicker onSelect={handlePersonaSelect} />
            <CommandHelp onCommandSelect={(cmd) => handleValueChange(cmd + ' ')} />
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
