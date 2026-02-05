import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { getToolCallsFromMessage } from '../utils'
import { MessageItem } from './message-item'
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
  waitingForResponse: boolean
  sessionKey?: string
  pinToTop: boolean
  pinGroupMinHeight: number
  headerHeight: number
  contentStyle?: React.CSSProperties
}

function ChatMessageListComponent({
  messages,
  loading,
  empty,
  waitingForResponse,
  sessionKey,
  pinToTop,
  pinGroupMinHeight,
  headerHeight,
  contentStyle,
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
        {empty ? (
          <div aria-hidden></div>
        ) : hasGroup ? (
          <>
            {displayMessages
              .slice(0, groupStartIndex)
              .map((chatMessage, index) => {
                const messageKey =
                  chatMessage.__optimisticId || (chatMessage as any).id || index
                const forceActionsVisible =
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
                  />
                )
              })}
            {/* // Keep the last exchange pinned without extra tail gap. // Account
            for space-y-6 (24px) when pinning. */}
            <div
              className="flex flex-col space-y-6"
              style={{ minHeight: `${Math.max(0, pinGroupMinHeight - 24)}px` }}
            >
              {displayMessages
                .slice(groupStartIndex)
                .map((chatMessage, index) => {
                  const realIndex = groupStartIndex + index
                  const messageKey =
                    chatMessage.__optimisticId ||
                    (chatMessage as any).id ||
                    realIndex
                  const forceActionsVisible =
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
            </div>
          </>
        ) : (
          displayMessages.map((chatMessage, index) => {
            const messageKey =
              chatMessage.__optimisticId || (chatMessage as any).id || index
            const forceActionsVisible =
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
              />
            )
          })
        )}
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
    prev.waitingForResponse === next.waitingForResponse &&
    prev.sessionKey === next.sessionKey &&
    prev.pinToTop === next.pinToTop &&
    prev.pinGroupMinHeight === next.pinGroupMinHeight &&
    prev.headerHeight === next.headerHeight &&
    prev.contentStyle === next.contentStyle
  )
}

const MemoizedChatMessageList = memo(
  ChatMessageListComponent,
  areChatMessageListEqual,
)

export { MemoizedChatMessageList as ChatMessageList }
