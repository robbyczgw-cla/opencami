import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUp02Icon, Mic02Icon, StopIcon } from '@hugeicons/core-free-icons'
import type { DragEvent, KeyboardEvent, MutableRefObject, Ref } from 'react'

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
import {
  AttachmentButton,
  createAttachmentFromFile,
  isAcceptedImage,
  type AttachmentFile,
} from '@/components/attachment-button'
import { AttachmentPreviewList } from '@/components/attachment-preview'
import { SlashCommandMenu, type SlashCommand } from './slash-command-menu'
import { ThinkingLevelSelector } from './thinking-level-selector'

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
  // Model aliases
  { command: '/haiku', description: 'Switch to Claude Haiku 4.5' },
  { command: '/sonnet', description: 'Switch to Claude Sonnet 4.5' },
  { command: '/opus', description: 'Switch to Claude Opus 4.5' },
  { command: '/opus46', description: 'Switch to Claude Opus 4.6' },
  { command: '/codex', description: 'Switch to GPT 5.3 Codex' },
  { command: '/glm', description: 'Switch to GLM 4.7' },
  { command: '/kimi', description: 'Switch to Kimi K2.5' },
  { command: '/minimax', description: 'Switch to MiniMax M2.1' },
  { command: '/grok', description: 'Switch to Grok 4.1 Fast' },
  { command: '/model', description: 'Show model picker or switch model' },
  // Session
  { command: '/new', description: 'New chat (optional: /new model)' },
  { command: '/reset', description: 'Reset session' },
  { command: '/stop', description: 'Stop current generation' },
  { command: '/compact', description: 'Compact conversation context' },
  // Info
  { command: '/help', description: 'Show available commands' },
  { command: '/commands', description: 'List all commands' },
  { command: '/status', description: 'Show session status & usage' },
  { command: '/whoami', description: 'Show your sender ID' },
  { command: '/context', description: 'Show context window details' },
  { command: '/usage', description: 'Toggle usage footer (off/tokens/full/cost)' },
  // Directives
  { command: '/think', description: 'Set thinking level (off/low/medium/high)' },
  { command: '/reasoning', description: 'Toggle reasoning (on/off/stream)' },
  { command: '/verbose', description: 'Toggle verbose mode (on/full/off)' },
  { command: '/elevated', description: 'Toggle elevated permissions (on/off/ask)' },
  { command: '/exec', description: 'Configure exec settings' },
  { command: '/queue', description: 'Show/configure message queue' },
  // TTS
  { command: '/tts', description: 'Text-to-speech (off/always/tagged/status)' },
  // Sub-agents
  { command: '/subagents', description: 'List/stop/log sub-agent runs' },
  // Skills
  { command: '/followups', description: 'Show follow-up suggestions' },
  { command: '/skill', description: 'Run a skill by name' },
  // Admin
  { command: '/allowlist', description: 'List/add/remove allowlist entries' },
  { command: '/approve', description: 'Resolve exec approval (allow/deny)' },
  { command: '/config', description: 'Show/get/set config (owner-only)' },
  { command: '/debug', description: 'Runtime overrides (owner-only)' },
  { command: '/send', description: 'Toggle message sending (on/off)' },
  { command: '/restart', description: 'Restart gateway' },
  { command: '/activation', description: 'Set activation mode (mention/always)' },
  // Channels
  { command: '/dock-telegram', description: 'Switch replies to Telegram' },
  { command: '/dock-discord', description: 'Switch replies to Discord' },
  // Other
  { command: '/bash', description: 'Run host shell command' },
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
  const [isDragActive, setIsDragActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [sttLoading, setSttLoading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webSpeechRef = useRef<any>(null)
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
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    const hasFiles = Array.from(event.dataTransfer.types).includes('Files')
    if (!hasFiles) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragActive(true)
  }, [])
  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    setIsDragActive(false)
  }, [])
  const handleDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragActive(false)

    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length === 0) return

    const imageFiles = files.filter((file) => isAcceptedImage(file))
    if (imageFiles.length === 0) return

    const newAttachments = await Promise.all(imageFiles.map((file) => createAttachmentFromFile(file)))
    setAttachments((prev) => [...prev, ...newAttachments])
    focusPrompt()
  }, [focusPrompt])
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
  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (webSpeechRef.current) webSpeechRef.current.abort()
    }
  }, [])

  const getSttProvider = useCallback((): string => {
    if (typeof window === 'undefined') return 'auto'
    try {
      return localStorage.getItem('opencami-stt-provider') || 'auto'
    } catch {
      return 'auto'
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (webSpeechRef.current) {
      webSpeechRef.current.stop()
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setIsRecording(false)
    setRecordingTime(0)
  }, [])

  const startRecording = useCallback(async () => {
    const provider = getSttProvider()

    // Browser Web Speech API path
    if (provider === 'browser') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        alert('Web Speech API is not supported in this browser.')
        return
      }
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = navigator.language || 'en-US'
      webSpeechRef.current = recognition

      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 119) {
            stopRecording()
            return 0
          }
          return t + 1
        })
      }, 1000)

      let transcript = ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript
          }
        }
      }
      recognition.onend = () => {
        setIsRecording(false)
        setRecordingTime(0)
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        if (transcript.trim()) {
          setValue((prev) => prev + (prev ? ' ' : '') + transcript.trim())
          focusPrompt()
        }
      }
      recognition.onerror = () => {
        setIsRecording(false)
        setRecordingTime(0)
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      }
      recognition.start()
      return
    }

    // MediaRecorder path (send to server)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      recordingChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const audioBlob = new Blob(recordingChunksRef.current, { type: mimeType })
        if (audioBlob.size === 0) return

        setSttLoading(true)
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, `recording.${mimeType === 'audio/webm' ? 'webm' : 'mp4'}`)
          if (provider !== 'auto') formData.append('provider', provider)

          const res = await fetch('/api/stt', { method: 'POST', body: formData })
          const data = (await res.json()) as { ok: boolean; text?: string; error?: string }
          if (data.ok && data.text) {
            setValue((prev) => prev + (prev ? ' ' : '') + data.text)
            focusPrompt()
          } else if (!data.ok) {
            console.warn('STT failed:', data.error)
            alert(data.error || 'Speech-to-text failed. Try the Browser provider in Settings.')
          }
        } catch (err) {
          console.warn('STT request failed:', err)
          alert('Could not reach speech-to-text service.')
        } finally {
          setSttLoading(false)
        }
      }

      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 119) {
            stopRecording()
            return 0
          }
          return t + 1
        })
      }, 1000)

      recorder.start()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        // On Android/PWA, explicitly request permission first
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          if (status.state === 'denied') {
            alert('Microphone access is blocked. Please enable it in your browser/app settings.')
          } else {
            alert('Microphone permission was not granted. Please try again and allow access when prompted.')
          }
        } catch {
          alert('Could not access microphone. Please check your browser settings and allow microphone access for this site.')
        }
      } else {
        alert('Could not access microphone: ' + msg)
      }
    }
  }, [getSttProvider, stopRecording, focusPrompt])

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, stopRecording, startRecording])

  const validAttachments = attachments.filter((a) => !a.error && a.base64)
  const submitDisabled = disabled || (value.trim().length === 0 && validAttachments.length === 0)

  return (
    <div
      className="mx-auto w-full max-w-full px-2 md:px-5 sm:max-w-[768px] sm:min-w-[400px] relative pb-1 md:pb-3"
      ref={wrapperRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragActive && (
        <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary-400 bg-primary-50/90 text-sm font-medium text-primary-700">
          Drop image here
        </div>
      )}
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
            <ThinkingLevelSelector />
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
            <PromptInputAction tooltip={isRecording ? 'Stop recording' : 'Voice input'}>
              <Button
                onClick={handleMicClick}
                disabled={disabled || sttLoading}
                size="icon-sm"
                variant={isRecording ? 'destructive' : 'ghost'}
                className={`rounded-full ${isRecording ? 'animate-pulse' : ''}`}
                aria-label={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {sttLoading ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isRecording ? (
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-red-500" />
                    <span className="text-xs tabular-nums">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</span>
                    <HugeiconsIcon icon={StopIcon} size={14} strokeWidth={2} />
                  </span>
                ) : (
                  <HugeiconsIcon icon={Mic02Icon} size={18} strokeWidth={2} />
                )}
              </Button>
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
