import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { getToolCallsFromMessage, textFromMessage } from '../utils'
import { MessageItem } from './message-item'
import type { SearchSource } from '@/components/search-sources-badge'
import { FollowUpSuggestions } from './follow-up-suggestions'
import type { GatewayMessage } from '../types'
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from '@/components/prompt-kit/chat-container'
import { TypingIndicator } from '@/components/prompt-kit/typing-indicator'

type ChatMessageListProps = {
  messages: Array<GatewayMessage>
  loading: boolean
  empty: boolean
  emptyState?: React.ReactNode
  notice?: React.ReactNode
  noticePosition?: 'start' | 'end'
  waitingForResponse: boolean
  /** True while the assistant response is actively being streamed / fast-polled */
  isStreaming?: boolean
  sessionKey?: string
  pinToTop: boolean
  pinGroupMinHeight: number
  headerHeight: number
  contentStyle?: React.CSSProperties
  /** Callback when a follow-up suggestion is clicked */
  onFollowUpClick?: (suggestion: string) => void
}

function ChatMessageListComponent({
  messages,
  loading,
  empty,
  emptyState,
  notice,
  noticePosition = 'start',
  waitingForResponse,
  isStreaming = false,
  sessionKey,
  pinToTop,
  pinGroupMinHeight,
  headerHeight,
  contentStyle,
  onFollowUpClick,
}: ChatMessageListProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const lastUserRef = useRef<HTMLDivElement | null>(null)
  const programmaticScroll = useRef(false)
  const prevPinRef = useRef(pinToTop)
  const prevUserIndexRef = useRef<number | undefined>(undefined)

  // Filter out toolResult messages - they'll be displayed inside their associated tool calls
  const displayMessages = useMemo(() => {
    return messages.filter((msg) => msg.role !== 'toolResult')
  }, [messages])

  const toolResultsByCallId = useMemo(() => {
    const map = new Map<string, GatewayMessage>()
    for (const message of messages) {
      if (message.role !== 'toolResult') continue
      const toolCallId = message.toolCallId
      if (typeof toolCallId === 'string' && toolCallId.trim().length > 0) {
        map.set(toolCallId, message)
      }
    }
    return map
  }, [messages])

  // Aggregate all search sources across all assistant messages for the badge
  const aggregatedSearchSources = useMemo(() => {
    // Strip Gateway security tags from search result text
    const strip = (s: string) => {
      if (!s) return ''
      return s
        .replace(/SECURITY NOTICE:[\s\S]*?<<<EXTERNAL_UNTRUSTED_CONTENT>>>/g, '')
        .replace(/<<<\/?EXTERNAL_UNTRUSTED_CONTENT>>>/g, '')
        .replace(/<<<\/?END_EXTERNAL_UNTRUSTED_CONTENT>>>/g, '')
        .replace(/Source: Web (?:Search|Fetch)\n---/g, '')
        .replace(/\n{2,}/g, '\n')
        .trim()
    }
    // Try to extract search results from any JSON text
    const extractResults = (text: string, sources: SearchSource[], seenUrls: Set<string>) => {
      try {
        const parsed = JSON.parse(text)
        // Handle web-search-plus format: { provider, query, results: [...] }
        // Handle web_search format: { results: [...] } or direct array
        const items = Array.isArray(parsed) ? parsed
          : parsed?.results ?? parsed?.web?.results ?? []
        if (!Array.isArray(items)) return false
        let found = false
        for (const item of items) {
          if (item?.url && item?.title && !seenUrls.has(item.url)) {
            seenUrls.add(item.url)
            sources.push({
              title: strip(item.title),
              url: item.url,
              snippet: strip(item.description || item.snippet || item.content || '')
            })
            found = true
          }
        }
        return found
      } catch { return false }
    }
    const sources: SearchSource[] = []
    const seenUrls = new Set<string>()
    for (const msg of displayMessages) {
      if (msg.role !== 'assistant') continue
      const toolCalls = getToolCallsFromMessage(msg)
      for (const tc of toolCalls) {
        if (!tc.id) continue
        const isSearch = tc.name === 'web_search'
        const isFetch = tc.name === 'web_fetch'
        const isExec = tc.name === 'exec'
        if (!isSearch && !isFetch && !isExec) continue
        const result = toolResultsByCallId.get(tc.id)
        if (!result) continue
        const text = result.content
          ?.map((p: any) => (p.type === 'text' ? String(p.text ?? '') : ''))
          .join('')
          .trim()
        if (!text) continue
        if (isSearch || isExec) {
          // For exec: only extract if the output looks like search JSON
          // (has "results" array with url+title objects)
          if (isExec) {
            // Quick check: must contain "results" and "url" to be search output
            if (!text.includes('"results"') || !text.includes('"url"')) continue
          }
          // Try to find JSON in the text (exec output may have extra text before/after)
          let jsonText = text
          const jsonStart = text.indexOf('{')
          if (jsonStart > 0) jsonText = text.slice(jsonStart)
          const jsonEnd = jsonText.lastIndexOf('}')
          if (jsonEnd > 0) jsonText = jsonText.slice(0, jsonEnd + 1)
          extractResults(jsonText, sources, seenUrls)
        } else if (isFetch) {
          const url = tc.arguments?.url as string
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url)
            let title: string
            try { title = new URL(url).hostname } catch { title = url }
            sources.push({ title, url })
          }
        }
      }
    }
    return sources
  }, [displayMessages, toolResultsByCallId])

  const lastAssistantIndex = displayMessages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.role !== 'user')
    .map(({ index }) => index)
    .pop()
  const lastUserIndex = displayMessages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.role === 'user')
    .map(({ index }) => index)
    .pop()
  const showTypingIndicator =
    waitingForResponse &&
    (typeof lastUserIndex !== 'number' ||
      typeof lastAssistantIndex !== 'number' ||
      lastAssistantIndex < lastUserIndex)
  // Pin the last user+assistant group without adding bottom padding.
  const groupStartIndex = typeof lastUserIndex === 'number' ? lastUserIndex : -1
  const hasGroup = pinToTop && groupStartIndex >= 0

  // Get the last assistant message text for follow-up suggestions
  const lastAssistantMessage =
    typeof lastAssistantIndex === 'number'
      ? displayMessages[lastAssistantIndex]
      : undefined
  const lastAssistantText = lastAssistantMessage
    ? textFromMessage(lastAssistantMessage)
    : ''
  // Show follow-ups only when:
  // - Not waiting for response
  // - There's a last assistant message
  // - The last message in conversation is from assistant (not user waiting for response)
  const showFollowUps =
    !waitingForResponse &&
    !isStreaming &&
    lastAssistantText.length > 0 &&
    onFollowUpClick !== undefined &&
    (typeof lastUserIndex !== 'number' ||
      typeof lastAssistantIndex !== 'number' ||
      lastAssistantIndex > lastUserIndex)

  useLayoutEffect(() => {
    if (loading) return
    if (pinToTop) {
      const shouldPin =
        !prevPinRef.current || prevUserIndexRef.current !== lastUserIndex
      prevPinRef.current = true
      prevUserIndexRef.current = lastUserIndex
      if (shouldPin && lastUserRef.current) {
        programmaticScroll.current = true
        lastUserRef.current.scrollIntoView({ behavior: 'auto', block: 'start' })
        window.setTimeout(() => {
          programmaticScroll.current = false
        }, 0)
      }
      return
    }

    prevPinRef.current = false
    prevUserIndexRef.current = lastUserIndex
    if (anchorRef.current) {
      programmaticScroll.current = true
      anchorRef.current.scrollIntoView({ behavior: 'auto', block: 'end' })
      window.setTimeout(() => {
        programmaticScroll.current = false
      }, 0)
    }
  }, [loading, displayMessages.length, sessionKey, pinToTop, lastUserIndex])

  return (
    // mt-2 is to fix the prompt-input cut off
    <ChatContainerRoot className="flex-1 min-h-0 -mb-4">
      <ChatContainerContent className="pt-6" style={contentStyle}>
        {notice && noticePosition === 'start' ? notice : null}
        {empty && !notice ? (
          (emptyState ?? <div aria-hidden></div>)
        ) : hasGroup ? (
          <>
            {displayMessages
              .slice(0, groupStartIndex)
              .map((chatMessage, index) => {
                const messageKey =
                  index
                const forceActionsVisible =
                  typeof lastAssistantIndex === 'number' &&
                  index === lastAssistantIndex
                const isLastAssistant =
                  typeof lastAssistantIndex === 'number' &&
                  index === lastAssistantIndex
                const hasToolCalls =
                  chatMessage.role === 'assistant' &&
                  getToolCallsFromMessage(chatMessage).length > 0
                return (
                  <MessageItem
                    key={messageKey}
                    message={chatMessage}
                    toolResultsByCallId={
                      hasToolCalls ? toolResultsByCallId : undefined
                    }
                    forceActionsVisible={forceActionsVisible}
                    isStreaming={isLastAssistant && isStreaming}
                    isLastAssistant={isLastAssistant}
                    aggregatedSearchSources={isLastAssistant ? aggregatedSearchSources : undefined}
                  />
                )
              })}
            {/* // Keep the last exchange pinned without extra tail gap. // Account
            for space-y-6 (24px) when pinning. */}
            <div
              className="flex flex-col space-y-3 md:space-y-6"
              style={{ minHeight: `${Math.max(0, pinGroupMinHeight - 24)}px` }}
            >
              {displayMessages
                .slice(groupStartIndex)
                .map((chatMessage, index) => {
                  const realIndex = groupStartIndex + index
                  const messageKey = realIndex
                  const forceActionsVisible =
                    typeof lastAssistantIndex === 'number' &&
                    realIndex === lastAssistantIndex
                  const isLastAssistant =
                    typeof lastAssistantIndex === 'number' &&
                    realIndex === lastAssistantIndex
                  const wrapperRef =
                    realIndex === lastUserIndex ? lastUserRef : undefined
                  const wrapperClassName =
                    realIndex === lastUserIndex ? 'scroll-mt-0' : undefined
                  const wrapperScrollMarginTop =
                    realIndex === lastUserIndex ? headerHeight : undefined
                  const hasToolCalls =
                    chatMessage.role === 'assistant' &&
                    getToolCallsFromMessage(chatMessage).length > 0
                  return (
                    <MessageItem
                      key={messageKey}
                      message={chatMessage}
                      toolResultsByCallId={
                        hasToolCalls ? toolResultsByCallId : undefined
                      }
                      forceActionsVisible={forceActionsVisible}
                      isStreaming={isLastAssistant && isStreaming}
                    isLastAssistant={isLastAssistant}
                    aggregatedSearchSources={isLastAssistant ? aggregatedSearchSources : undefined}
                      wrapperRef={wrapperRef}
                      wrapperClassName={wrapperClassName}
                      wrapperScrollMarginTop={wrapperScrollMarginTop}
                    />
                  )
                })}
              {showTypingIndicator ? (
                <div className="py-2">
                  <TypingIndicator />
                </div>
              ) : null}
              {showFollowUps && onFollowUpClick ? (
                <FollowUpSuggestions
                  responseText={lastAssistantText}
                  onSuggestionClick={onFollowUpClick}
                  disabled={waitingForResponse}
                />
              ) : null}
            </div>
          </>
        ) : (
          <>
            {displayMessages.map((chatMessage, index) => {
              const messageKey =
                index
              const forceActionsVisible =
                typeof lastAssistantIndex === 'number' &&
                index === lastAssistantIndex
              const isLastAssistant =
                typeof lastAssistantIndex === 'number' &&
                index === lastAssistantIndex
              const hasToolCalls =
                chatMessage.role === 'assistant' &&
                getToolCallsFromMessage(chatMessage).length > 0
              return (
                <MessageItem
                  key={messageKey}
                  message={chatMessage}
                  toolResultsByCallId={
                    hasToolCalls ? toolResultsByCallId : undefined
                  }
                  forceActionsVisible={forceActionsVisible}
                  isStreaming={isLastAssistant && isStreaming}
                    isLastAssistant={isLastAssistant}
                    aggregatedSearchSources={isLastAssistant ? aggregatedSearchSources : undefined}
                />
              )
            })}
            {showFollowUps && onFollowUpClick ? (
              <FollowUpSuggestions
                responseText={lastAssistantText}
                onSuggestionClick={onFollowUpClick}
                disabled={waitingForResponse}
              />
            ) : null}
          </>
        )}
        {notice && noticePosition === 'end' ? notice : null}
        <ChatContainerScrollAnchor
          ref={anchorRef as React.RefObject<HTMLDivElement>}
        />
      </ChatContainerContent>
    </ChatContainerRoot>
  )
}

function areChatMessageListEqual(
  prev: ChatMessageListProps,
  next: ChatMessageListProps,
) {
  return (
    prev.messages === next.messages &&
    prev.loading === next.loading &&
    prev.empty === next.empty &&
    prev.emptyState === next.emptyState &&
    prev.notice === next.notice &&
    prev.noticePosition === next.noticePosition &&
    prev.waitingForResponse === next.waitingForResponse &&
    prev.isStreaming === next.isStreaming &&
    prev.sessionKey === next.sessionKey &&
    prev.pinToTop === next.pinToTop &&
    prev.pinGroupMinHeight === next.pinGroupMinHeight &&
    prev.headerHeight === next.headerHeight &&
    prev.contentStyle === next.contentStyle &&
    prev.onFollowUpClick === next.onFollowUpClick
  )
}

const MemoizedChatMessageList = memo(
  ChatMessageListComponent,
  areChatMessageListEqual,
)

export { MemoizedChatMessageList as ChatMessageList }
