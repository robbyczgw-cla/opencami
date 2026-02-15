import { memo, useEffect, useMemo, useState } from 'react'
import {
  getMessageTimestamp,
  getToolCallsFromMessage,
  textFromMessage,
} from '../utils'
import { MessageActionsBar } from './message-actions-bar'
import type { GatewayMessage, ToolCallContent } from '../types'
import type { ToolPart } from '@/components/prompt-kit/tool'
import { Message, MessageContent } from '@/components/prompt-kit/message'
import { Thinking } from '@/components/prompt-kit/thinking'
import { Tool } from '@/components/prompt-kit/tool'
import { useChatSettings } from '@/hooks/use-chat-settings'
import { cn } from '@/lib/utils'
import { SearchSourcesBadge, type SearchSource } from '@/components/search-sources-badge'
import { HugeiconsIcon } from '@hugeicons/react'
import { File01Icon } from '@hugeicons/core-free-icons'
import { useNavigate } from '@tanstack/react-router'
import { useFileExplorerState } from '@/screens/files/hooks/use-file-explorer-state'

type MessageItemProps = {
  message: GatewayMessage
  toolResultsByCallId?: Map<string, GatewayMessage>
  forceActionsVisible?: boolean
  /** When true, assistant content uses a fade-in animation for streamed text */
  isStreaming?: boolean
  /** Whether this is the last assistant message in the conversation */
  isLastAssistant?: boolean
  /** Pre-aggregated search sources from all messages (passed only to the last assistant message) */
  aggregatedSearchSources?: SearchSource[]
  wrapperRef?: React.RefObject<HTMLDivElement | null>
  wrapperClassName?: string
  wrapperScrollMarginTop?: number
  messageDomId?: string
  highlighted?: boolean
}

function mapToolCallToToolPart(
  toolCall: ToolCallContent,
  resultMessage: GatewayMessage | undefined,
): ToolPart {
  const hasResult = resultMessage !== undefined
  const isError = resultMessage?.isError ?? false

  let state: ToolPart['state']
  if (!hasResult) {
    state = 'input-available'
  } else if (isError) {
    state = 'output-error'
  } else {
    state = 'output-available'
  }

  // Extract error text from result message content
  let errorText: string | undefined
  if (isError && resultMessage?.content?.[0]?.type === 'text') {
    errorText = resultMessage.content[0].text || 'Unknown error'
  }

  const outputText = resultMessage?.content
    ?.map((part) => (part.type === 'text' ? String(part.text ?? '') : ''))
    .join('')
    .trim()

  const output = resultMessage?.details ?? (outputText && outputText.length > 0 ? outputText : undefined)

  return {
    type: toolCall.name || 'unknown',
    state,
    input: toolCall.arguments,
    output,
    toolCallId: toolCall.id,
    errorText,
  }
}

function toolCallsSignature(message: GatewayMessage): string {
  const toolCalls = getToolCallsFromMessage(message)
  return toolCalls
    .map((toolCall) => {
      const id = toolCall.id ?? ''
      const name = toolCall.name ?? ''
      const partialJson = toolCall.partialJson ?? ''
      const args = toolCall.arguments ? JSON.stringify(toolCall.arguments) : ''
      return `${id}|${name}|${partialJson}|${args}`
    })
    .join('||')
}

function toolResultSignature(result: GatewayMessage | undefined): string {
  if (!result) return 'missing'
  const content = Array.isArray(result.content) ? result.content : []
  const text = content
    .map((part) => (part.type === 'text' ? String(part.text ?? '') : ''))
    .join('')
    .trim()
  const details = result.details ? JSON.stringify(result.details) : ''
  return `${result.toolCallId ?? ''}|${result.toolName ?? ''}|${result.isError ? '1' : '0'}|${text}|${details}`
}

function toolResultsSignature(
  message: GatewayMessage,
  toolResultsByCallId: Map<string, GatewayMessage> | undefined,
): string {
  if (!toolResultsByCallId) return ''
  const toolCalls = getToolCallsFromMessage(message)
  if (toolCalls.length === 0) return ''
  return toolCalls
    .map((toolCall) => {
      if (!toolCall.id) return 'missing'
      return toolResultSignature(toolResultsByCallId.get(toolCall.id))
    })
    .join('||')
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 1_000_000_000_000) return value * 1000
    return value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

function rawTimestamp(message: GatewayMessage): number | null {
  const candidates = [
    (message as any).createdAt,
    (message as any).created_at,
    (message as any).timestamp,
    (message as any).time,
    (message as any).ts,
  ]
  for (const candidate of candidates) {
    const normalized = normalizeTimestamp(candidate)
    if (normalized) return normalized
  }
  return null
}

function thinkingFromMessage(msg: GatewayMessage): string | null {
  const parts = Array.isArray(msg.content) ? msg.content : []
  const thinkingPart = parts.find((part) => part.type === 'thinking')
  if (thinkingPart && 'thinking' in thinkingPart) {
    return String(thinkingPart.thinking ?? '')
  }
  return null
}

/**
 * Represents an image attachment in message content.
 */
type ImagePart = {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

/**
 * Extracts image attachments from a gateway message.
 * @param msg - The gateway message to extract images from
 * @returns Array of image parts with base64 data
 */
function imagesFromMessage(msg: GatewayMessage): ImagePart[] {
  const parts = Array.isArray(msg.content) ? msg.content : []
  const images: ImagePart[] = []
  for (const part of parts) {
    if (
      part.type === 'image' &&
      'source' in part &&
      typeof (part as ImagePart).source?.data === 'string'
    ) {
      images.push(part as ImagePart)
    }
  }
  return images
}

type UploadedFileReference = {
  path: string
  filename: string
}

const UPLOADED_FILE_LINE_REGEX = /^📎 Uploaded file:\s*(\/uploads\/\S+)\s*$/

function formatFileSize(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`
}

function getLeadingUploadedFileLines(text: string): string[] {
  if (!text) return []
  const trimmedStart = text.trimStart()

  // Don't parse references inside quoted text or code blocks
  if (trimmedStart.startsWith('>') || trimmedStart.startsWith('```')) {
    return []
  }

  const lines = text.split('\n')
  const uploadedLines: string[] = []

  for (const line of lines) {
    if (UPLOADED_FILE_LINE_REGEX.test(line)) {
      uploadedLines.push(line)
      continue
    }

    // Allow empty spacer lines between leading upload lines and the rest of the message
    if (uploadedLines.length > 0 && line.trim() === '') {
      uploadedLines.push(line)
      continue
    }

    break
  }

  const firstLine = lines[0] ?? ''
  if (!UPLOADED_FILE_LINE_REGEX.test(firstLine)) {
    return []
  }

  return uploadedLines.filter((line) => UPLOADED_FILE_LINE_REGEX.test(line))
}

function parseUploadedFileReferences(text: string): UploadedFileReference[] {
  const refs: UploadedFileReference[] = []
  const seen = new Set<string>()

  for (const line of getLeadingUploadedFileLines(text)) {
    const match = line.match(UPLOADED_FILE_LINE_REGEX)
    const filePath = match?.[1]
    if (!filePath || seen.has(filePath)) continue
    seen.add(filePath)
    refs.push({
      path: filePath,
      filename: filePath.split('/').pop() || filePath,
    })
  }

  return refs
}

function stripUploadedFileLines(text: string): string {
  const lines = text.split('\n')
  if (!UPLOADED_FILE_LINE_REGEX.test(lines[0] ?? '')) {
    return text.trim()
  }

  let index = 0
  while (index < lines.length && UPLOADED_FILE_LINE_REGEX.test(lines[index])) {
    index++
  }
  while (index < lines.length && lines[index].trim() === '') {
    index++
  }

  return lines.slice(index).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function MessageItemComponent({
  message,
  toolResultsByCallId,
  forceActionsVisible = false,
  isStreaming = false,
  isLastAssistant = false,
  aggregatedSearchSources,
  wrapperRef,
  wrapperClassName,
  wrapperScrollMarginTop,
  messageDomId,
  highlighted = false,
}: MessageItemProps) {
  const { settings } = useChatSettings()
  const role = message.role || 'assistant'
  const text = textFromMessage(message)
  const thinking = thinkingFromMessage(message)
  const images = imagesFromMessage(message)
  const isUser = role === 'user'
  const timestamp = getMessageTimestamp(message)
  const navigate = useNavigate()
  const openInEditor = useFileExplorerState((state) => state.openInEditor)

  const uploadedFileRefs = useMemo(() => parseUploadedFileReferences(text), [text])
  const [fileSizes, setFileSizes] = useState<Record<string, number | null>>({})
  const displayText = useMemo(() => stripUploadedFileLines(text), [text])

  useEffect(() => {
    let cancelled = false

    async function loadSizes() {
      const nextSizes: Record<string, number | null> = {}

      await Promise.all(
        uploadedFileRefs.map(async (ref) => {
          try {
            const response = await fetch(`/api/files/info?path=${encodeURIComponent(ref.path)}`)
            if (!response.ok) {
              nextSizes[ref.path] = null
              return
            }
            const data = (await response.json()) as { size?: number }
            nextSizes[ref.path] = typeof data.size === 'number' ? data.size : null
          } catch {
            nextSizes[ref.path] = null
          }
        }),
      )

      if (!cancelled) {
        setFileSizes(nextSizes)
      }
    }

    if (uploadedFileRefs.length > 0) {
      void loadSizes()
    } else {
      setFileSizes({})
    }

    return () => {
      cancelled = true
    }
  }, [uploadedFileRefs])

  const handleOpenFile = async (filePath: string) => {
    openInEditor(filePath)
    await navigate({ to: '/files' })
  }

  // Get tool calls from this message (for assistant messages)
  const toolCalls = role === 'assistant' ? getToolCallsFromMessage(message) : []
  const hasToolCalls = toolCalls.length > 0
  // Search sources are shown only on the last assistant message via aggregatedSearchSources
  const searchSources = isLastAssistant && !isStreaming && settings.showSearchSources && aggregatedSearchSources ? aggregatedSearchSources : []

  return (
    <div
      ref={wrapperRef}
      id={messageDomId}
      data-message-id={messageDomId}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 120px',
        ...(typeof wrapperScrollMarginTop === 'number'
          ? { scrollMarginTop: `${wrapperScrollMarginTop}px` }
          : undefined),
      }}
      className={cn(
        'opencami-message-item group mx-auto flex w-full max-w-[var(--opencami-chat-width)] flex-col gap-1 py-[var(--opencami-msg-padding-y)]',
        wrapperClassName,
        highlighted && 'opencami-message-highlight',
        isUser ? 'items-end' : 'items-start',
      )}
    >
      {thinking && settings.showReasoningBlocks && (
        <div className="w-full max-w-[var(--opencami-chat-width)]">
          <Thinking content={thinking} />
        </div>
      )}
      {/* Render images if present */}
      {images.length > 0 && (
        <div className={cn(
          'flex flex-wrap gap-2 mb-2',
          isUser ? 'justify-end' : 'justify-start'
        )}>
          {images.map((img, idx) => (
            <img
              key={idx}
              src={`data:${img.source.media_type};base64,${img.source.data}`}
              alt={`Attachment ${idx + 1}`}
              loading="lazy"
              decoding="async"
              className="max-w-[300px] max-h-[300px] rounded-lg object-cover"
            />
          ))}
        </div>
      )}
      {uploadedFileRefs.length > 0 && (
        <div className={cn('mb-2 flex w-full flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
          {uploadedFileRefs.map((fileRef) => (
            <button
              key={fileRef.path}
              type="button"
              onClick={() => {
                void handleOpenFile(fileRef.path)
              }}
              className="flex max-w-full items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-left hover:bg-primary-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
                <HugeiconsIcon icon={File01Icon} size={18} className="text-primary-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary-900">{fileRef.filename}</p>
                <p className="text-xs text-primary-600">{formatFileSize(fileSizes[fileRef.path] ?? null)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <Message className={cn('min-w-0 max-w-full', isUser ? 'flex-row-reverse' : '')}>
        <MessageContent
          markdown={!isUser}
          className={cn(
            'text-primary-900 opencami-text-size min-w-0 max-w-full',
            isUser
              ? 'opencami-message-user bg-primary-100 px-4 py-[var(--opencami-user-bubble-py)] max-w-[85%]'
              : 'opencami-message-assistant bg-transparent w-full',
            !isUser && isStreaming && 'stream-fade-in',
          )}
        >
          {displayText}
        </MessageContent>
      </Message>

      {/* Render tool calls with their results */}
      {hasToolCalls && settings.showToolMessages && (
        <div className="mt-2 flex w-full min-w-0 max-w-[var(--opencami-chat-width)] flex-col gap-3 overflow-x-hidden">
          {toolCalls.map((toolCall) => {
            const resultMessage = toolCall.id
              ? toolResultsByCallId?.get(toolCall.id)
              : undefined
            const toolPart = mapToolCallToToolPart(toolCall, resultMessage)

            return (
              <Tool
                key={toolCall.id || toolCall.name}
                toolPart={toolPart}
                defaultOpen={false}
              />
            )
          })}
        </div>
      )}

      {searchSources.length > 0 && (
        <div className="w-full max-w-[var(--opencami-chat-width)]">
          <SearchSourcesBadge sources={searchSources} />
        </div>
      )}

      {!hasToolCalls && (
        <MessageActionsBar
          text={text}
          timestamp={timestamp}
          align={isUser ? 'end' : 'start'}
          forceVisible={forceActionsVisible}
        />
      )}
    </div>
  )
}

function areMessagesEqual(
  prevProps: MessageItemProps,
  nextProps: MessageItemProps,
): boolean {
  if (prevProps.forceActionsVisible !== nextProps.forceActionsVisible) {
    return false
  }
  if (prevProps.isStreaming !== nextProps.isStreaming) return false
  if (prevProps.isLastAssistant !== nextProps.isLastAssistant) return false
  if (prevProps.aggregatedSearchSources !== nextProps.aggregatedSearchSources) return false
  if (prevProps.wrapperClassName !== nextProps.wrapperClassName) return false
  if (prevProps.wrapperRef !== nextProps.wrapperRef) return false
  if (prevProps.wrapperScrollMarginTop !== nextProps.wrapperScrollMarginTop) {
    return false
  }
  if (prevProps.messageDomId !== nextProps.messageDomId) return false
  if (prevProps.highlighted !== nextProps.highlighted) return false
  if (
    (prevProps.message.role || 'assistant') !==
    (nextProps.message.role || 'assistant')
  ) {
    return false
  }
  if (
    textFromMessage(prevProps.message) !== textFromMessage(nextProps.message)
  ) {
    return false
  }
  if (
    thinkingFromMessage(prevProps.message) !==
    thinkingFromMessage(nextProps.message)
  ) {
    return false
  }
  if (
    toolCallsSignature(prevProps.message) !==
    toolCallsSignature(nextProps.message)
  ) {
    return false
  }
  if (
    toolResultsSignature(prevProps.message, prevProps.toolResultsByCallId) !==
    toolResultsSignature(nextProps.message, nextProps.toolResultsByCallId)
  ) {
    return false
  }
  if (rawTimestamp(prevProps.message) !== rawTimestamp(nextProps.message)) {
    return false
  }
  // No need to check settings here as the hook will cause a re-render
  // and areMessagesEqual is for props only.
  // However, memo components with hooks will re-render if the hook state changes.
  return true
}

const MemoizedMessageItem = memo(MessageItemComponent, areMessagesEqual)

export { MemoizedMessageItem as MessageItem }
