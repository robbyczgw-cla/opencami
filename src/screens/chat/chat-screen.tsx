import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  deriveFriendlyIdFromKey,
  isMissingGatewayAuth,
  readError,
  textFromMessage,
} from './utils'
import { createOptimisticMessage } from './chat-screen-utils'
import {
  chatQueryKeys,
  appendHistoryMessage,
  clearHistoryMessages,
  fetchGatewayStatus,
  removeHistoryMessageByClientId,
  updateHistoryMessageByClientId,
  updateSessionLastMessage,
  updateSessionLabel,
} from './chat-queries'
import { chatUiQueryKey, getChatUiState, setChatUiState } from './chat-ui'
import { ChatSidebar } from './components/chat-sidebar'
import { ChatHeader } from './components/chat-header'
import { ChatMessageList } from './components/chat-message-list'
import { ChatComposer } from './components/chat-composer'
import type { AttachmentFile } from '@/components/attachment-button'
import { GatewayStatusMessage } from './components/gateway-status-message'
import {
  consumePendingSend,
  hasPendingGeneration,
  hasPendingSend,
  isRecentSession,
  resetPendingSend,
  setRecentSession,
  setPendingGeneration,
  stashPendingSend,
} from './pending-send'
import { useChatMeasurements } from './hooks/use-chat-measurements'
import { useChatHistory } from './hooks/use-chat-history'
import { useChatMobile } from './hooks/use-chat-mobile'
import { useChatSessions } from './hooks/use-chat-sessions'
import { useSmartTitle, useLlmTitlesEnabled } from './hooks/use-smart-title'
import { useStreaming } from './hooks/use-streaming'
import type { ChatComposerHelpers } from './components/chat-composer'
import type { HistoryResponse, GatewayMessage } from './types'
import { cn } from '@/lib/utils'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useSwipeGesture } from './hooks/use-swipe-gesture'
import type { SearchResult } from '@/hooks/use-search'

const KeyboardShortcutsDialog = lazy(() =>
  import('@/components/keyboard-shortcuts-dialog').then((m) => ({
    default: m.KeyboardShortcutsDialog,
  })),
)
const SearchDialog = lazy(() =>
  import('@/components/search-dialog').then((m) => ({
    default: m.SearchDialog,
  })),
)

type ChatScreenProps = {
  activeFriendlyId: string
  isNewChat?: boolean
  onSessionResolved?: (payload: {
    sessionKey: string
    friendlyId: string
  }) => void
  forcedSessionKey?: string
}

export function ChatScreen({
  activeFriendlyId,
  isNewChat = false,
  onSessionResolved,
  forcedSessionKey,
}: ChatScreenProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sending, setSending] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const { headerRef, composerRef, mainRef, pinGroupMinHeight, headerHeight } =
    useChatMeasurements()
  const [waitingForResponse, setWaitingForResponse] = useState(
    () => hasPendingSend() || hasPendingGeneration(),
  )
  const [pinToTop, setPinToTop] = useState(
    () => hasPendingSend() || hasPendingGeneration(),
  )
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [searchMode, setSearchMode] = useState<'global' | 'current'>('global')
  const [isStreaming, setIsStreaming] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const streamTimer = useRef<number | null>(null)
  const streamIdleTimer = useRef<number | null>(null)
  const lastAssistantSignature = useRef('')
  const refreshHistoryRef = useRef<() => void>(() => {})
  const pendingStartRef = useRef(false)
  const { isMobile } = useChatMobile(queryClient)
  const {
    sessionsQuery,
    sessions,
    activeExists,
    activeSessionKey,
    activeTitle,
    activeTokens,
    sessionsError,
  } = useChatSessions({ activeFriendlyId, isNewChat, forcedSessionKey })
  const {
    historyQuery,
    historyMessages,
    displayMessages,
    historyError,
    resolvedSessionKey,
    activeCanonicalKey,
    sessionKeyForHistory,
  } = useChatHistory({
    activeFriendlyId,
    activeSessionKey,
    forcedSessionKey,
    isNewChat,
    isRedirecting,
    activeExists,
    sessionsReady: sessionsQuery.isSuccess,
    queryClient,
  })

  const uiQuery = useQuery({
    queryKey: chatUiQueryKey,
    queryFn: function readUiState() {
      return getChatUiState(queryClient)
    },
    initialData: function initialUiState() {
      return getChatUiState(queryClient)
    },
    staleTime: Infinity,
  })
  const gatewayStatusQuery = useQuery({
    queryKey: ['gateway', 'status'],
    queryFn: fetchGatewayStatus,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
  })
  const gatewayStatusMountRef = useRef(Date.now())
  const gatewayStatusError =
    gatewayStatusQuery.error instanceof Error
      ? gatewayStatusQuery.error.message
      : gatewayStatusQuery.data && !gatewayStatusQuery.data.ok
        ? gatewayStatusQuery.data.error || 'Gateway unavailable'
        : null
  const gatewayError = gatewayStatusError ?? sessionsError ?? historyError
  const handleGatewayRefetch = useCallback(() => {
    void gatewayStatusQuery.refetch()
  }, [gatewayStatusQuery])
  const isSidebarCollapsed = uiQuery.data?.isSidebarCollapsed ?? false

  // Sidebar edge-swipe gesture (mobile only)
  const sidebarSwipeHandlers = useSwipeGesture({
    enabled: isMobile && isSidebarCollapsed,
    edgeWidth: 40,
    threshold: 50,
    direction: 'right',
    onSwipe: () => {
      setChatUiState(queryClient, (state) => ({
        ...state,
        isSidebarCollapsed: false,
      }))
    },
  })

  // Swipe-left to close sidebar (mobile only, when sidebar is open)
  const sidebarCloseSwipeHandlers = useSwipeGesture({
    enabled: isMobile && !isSidebarCollapsed,
    threshold: 50,
    direction: 'left',
    onSwipe: () => {
      setChatUiState(queryClient, (state) => ({
        ...state,
        isSidebarCollapsed: true,
      }))
    },
  })

  const handleActiveSessionDelete = useCallback(() => {
    setError(null)
    setIsRedirecting(true)
    navigate({ to: '/new', replace: true })
  }, [navigate])
  const streamStop = useCallback(() => {
    if (streamTimer.current) {
      window.clearInterval(streamTimer.current)
      streamTimer.current = null
    }
    if (streamIdleTimer.current) {
      window.clearTimeout(streamIdleTimer.current)
      streamIdleTimer.current = null
    }
  }, [])
  const streamFinish = useCallback(() => {
    streamStop()
    setPendingGeneration(false)
    setWaitingForResponse(false)
    setIsStreaming(false)
  }, [streamStop])

  // Smart title generation
  const llmTitlesEnabled = useLlmTitlesEnabled()
  const { generateTitle } = useSmartTitle()
  const titleGeneratedRef = useRef<Set<string>>(new Set())
  // Fast-polling interval (ms) used while the assistant is actively generating.
  // 150ms gives a near-real-time feel as Gateway sends block-streamed chunks.
  const FAST_POLL_MS = 150
  // Normal polling interval once the response is mostly stable but not yet
  // confirmed finished (idle-timeout window).
  const NORMAL_POLL_MS = 600

  const streamStart = useCallback(() => {
    if (!activeFriendlyId || isNewChat) return
    if (streamTimer.current) window.clearInterval(streamTimer.current)
    setIsStreaming(true)
    streamTimer.current = window.setInterval(() => {
      refreshHistoryRef.current()
    }, FAST_POLL_MS)
  }, [activeFriendlyId, isNewChat])

  // ── Real-time streaming via SSE ──────────────────────────────────────
  const handleStreamDoneRef = useRef<(sk: string) => void>(() => {})
  const handleStreamErrorRef = useRef<(err: string) => void>(() => {})

  const { streaming, startStream, stopStream } = useStreaming({
    onDone: (sk: string) => handleStreamDoneRef.current(sk),
    onError: (err: string) => handleStreamErrorRef.current(err),
  })

  handleStreamDoneRef.current = useCallback(
    async (_sk: string) => {
      // 1. Refetch history so the final persisted message is available
      await historyQuery.refetch()
      // 2. Now clear streaming + finish in one go. The streaming message
      //    is no longer needed because displayMessages already has the
      //    final assistant message from the refetch above.
      stopStream()
      streamFinish()
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.sessions })
    },
    [historyQuery, queryClient, stopStream, streamFinish],
  )
  handleStreamErrorRef.current = useCallback(
    (_err: string) => {
      console.warn('[stream] SSE error, falling back to polling')
    },
    [],
  )

  // Build a synthetic "streaming" assistant message from SSE deltas
  const streamingMessage = useMemo<GatewayMessage | null>(() => {
    // Keep showing streamed text after SSE "done" until history refetch
    // completes (waitingForResponse is still true until streamFinish runs)
    if (!streaming.text || (!streaming.active && !waitingForResponse)) return null
    const content: GatewayMessage['content'] = []
    // Add tool call indicators
    for (const tool of streaming.tools) {
      content.push({
        type: 'toolCall' as const,
        name: tool.name,
        id: tool.id,
      })
    }
    // Add text
    content.push({ type: 'text' as const, text: streaming.text })
    return {
      role: 'assistant',
      content,
      id: '__streaming__',
      __streaming: true,
      timestamp: Date.now(),
    } as GatewayMessage
  }, [streaming.active, streaming.text, streaming.tools, waitingForResponse])

  // Merge streaming message into display messages
  const messagesWithStreaming = useMemo(() => {
    if (!streamingMessage) return displayMessages
    const lastMsg = displayMessages[displayMessages.length - 1]
    // If history already has the complete assistant message, use it
    if (lastMsg?.role === 'assistant') {
      const lastText = textFromMessage(lastMsg)
      if (lastText.length >= streaming.text.length) return displayMessages
      // History has assistant msg but streaming is ahead — replace with streaming
      const msgs = [...displayMessages]
      msgs[msgs.length - 1] = streamingMessage
      return msgs
    }
    // No assistant message in history yet — append streaming
    return [...displayMessages, streamingMessage]
  }, [displayMessages, streamingMessage, streaming.text])

  const stableContentStyle = useMemo<React.CSSProperties>(() => ({}), [])
  refreshHistoryRef.current = function refreshHistory() {
    void historyQuery.refetch()
  }

  useEffect(() => {
    if (isRedirecting) {
      if (error) setError(null)
      return
    }
    if (shouldRedirectToNew) {
      if (error) setError(null)
      return
    }
    if (sessionsQuery.isSuccess && !activeExists) {
      if (error) setError(null)
      return
    }
    const messageText = sessionsError ?? historyError ?? gatewayStatusError
    if (!messageText) {
      if (error?.startsWith('Failed to load')) {
        setError(null)
      }
      return
    }
    if (isMissingGatewayAuth(messageText)) {
      navigate({ to: '/connect', replace: true })
    }
    const message = sessionsError
      ? `Failed to load sessions. ${sessionsError}`
      : historyError
        ? `Failed to load history. ${historyError}`
        : gatewayStatusError
          ? `Gateway unavailable. ${gatewayStatusError}`
          : null
    if (message) setError(message)
  }, [
    error,
    gatewayStatusError,
    historyError,
    isRedirecting,
    navigate,
    sessionsError,
  ])

  const shouldRedirectToNew =
    !isNewChat &&
    !forcedSessionKey &&
    !isRecentSession(activeFriendlyId) &&
    sessionsQuery.isSuccess &&
    sessions.length > 0 &&
    !sessions.some((session) => session.friendlyId === activeFriendlyId) &&
    !historyQuery.isFetching &&
    !historyQuery.isSuccess

  useEffect(() => {
    if (!isRedirecting) return
    if (isNewChat) {
      setIsRedirecting(false)
      return
    }
    if (!shouldRedirectToNew && sessionsQuery.isSuccess) {
      setIsRedirecting(false)
    }
  }, [isNewChat, isRedirecting, sessionsQuery.isSuccess, shouldRedirectToNew])

  useEffect(() => {
    if (isNewChat) return
    if (!sessionsQuery.isSuccess) return
    if (sessions.length === 0) return
    if (!shouldRedirectToNew) return
    resetPendingSend()
    clearHistoryMessages(queryClient, activeFriendlyId, sessionKeyForHistory)
    navigate({ to: '/new', replace: true })
  }, [
    activeFriendlyId,
    historyQuery.isFetching,
    historyQuery.isSuccess,
    isNewChat,
    navigate,
    queryClient,
    sessionKeyForHistory,
    sessions,
    sessionsQuery.isSuccess,
    shouldRedirectToNew,
  ])

  const hideUi = shouldRedirectToNew || isRedirecting

  // Downshift polling once content stops changing, then finish after a longer
  // idle period.  This avoids killing the stream prematurely (the previous 4 s
  // timeout sometimes fired before the Gateway had finished) while still being
  // responsive during generation.
  const pollingPhaseRef = useRef<'fast' | 'slow'>('fast')

  useEffect(() => {
    const latestMessage = historyMessages[historyMessages.length - 1]
    if (!latestMessage || latestMessage.role !== 'assistant') return
    const signature = `${historyMessages.length}:${textFromMessage(latestMessage).slice(-64)}`
    if (signature !== lastAssistantSignature.current) {
      lastAssistantSignature.current = signature

      // Content is still changing → ensure we're on the fast cadence.
      if (pollingPhaseRef.current !== 'fast' && streamTimer.current) {
        window.clearInterval(streamTimer.current)
        streamTimer.current = window.setInterval(() => {
          refreshHistoryRef.current()
        }, FAST_POLL_MS)
        pollingPhaseRef.current = 'fast'
      }

      if (streamIdleTimer.current) {
        window.clearTimeout(streamIdleTimer.current)
      }
      // After 1.5 s of no new content, downshift to slow polling.
      streamIdleTimer.current = window.setTimeout(() => {
        if (streamTimer.current) {
          window.clearInterval(streamTimer.current)
          streamTimer.current = window.setInterval(() => {
            refreshHistoryRef.current()
          }, NORMAL_POLL_MS)
          pollingPhaseRef.current = 'slow'
        }
        // After another 3 s of silence on slow cadence, finish entirely.
        streamIdleTimer.current = window.setTimeout(() => {
          streamFinish()
          pollingPhaseRef.current = 'fast'
        }, 3000)
      }, 1500)
    }
  }, [historyMessages, streamFinish])

  // Smart title generation effect
  // Triggers after first assistant response in a session
  useEffect(() => {
    // Skip if LLM titles are disabled
    if (!llmTitlesEnabled) return
    // Skip if new chat or redirecting
    if (isNewChat || isRedirecting) return
    // Skip if no session key
    const sessionKey = forcedSessionKey || resolvedSessionKey || activeSessionKey
    if (!sessionKey) return
    // Skip if already generated title for this session
    if (titleGeneratedRef.current.has(sessionKey)) return

    // Check if we have at least one user message and one assistant response
    const userMessages = historyMessages.filter((m) => m.role === 'user')
    const assistantMessages = historyMessages.filter((m) => m.role === 'assistant')
    
    if (userMessages.length === 0 || assistantMessages.length === 0) return

    // Only generate title for the first exchange (session just started)
    if (userMessages.length !== 1) return

    // Get the first user message text
    const firstUserMessage = textFromMessage(userMessages[0])
    if (!firstUserMessage || firstUserMessage.length < 5) return

    // Mark as generated to prevent duplicate calls
    titleGeneratedRef.current.add(sessionKey)

    // Generate and update title asynchronously
    void (async () => {
      try {
        const result = await generateTitle(firstUserMessage)
        if (result.title) {
          await updateSessionLabel(queryClient, sessionKey, activeFriendlyId, result.title)
        }
      } catch (err) {
        console.error('[smart-title] Error generating title:', err)
      }
    })()
  }, [
    llmTitlesEnabled,
    isNewChat,
    isRedirecting,
    forcedSessionKey,
    resolvedSessionKey,
    activeSessionKey,
    activeFriendlyId,
    historyMessages,
    generateTitle,
    queryClient,
  ])

  useEffect(() => {
    const resetKey = isNewChat ? 'new' : activeFriendlyId
    if (!resetKey) return
    if (pendingStartRef.current) {
      pendingStartRef.current = false
      return
    }
    if (hasPendingSend() || hasPendingGeneration()) {
      setWaitingForResponse(true)
      setPinToTop(true)
      return
    }
    streamStop()
    stopStream()
    lastAssistantSignature.current = ''
    setWaitingForResponse(false)
    setPinToTop(false)
    setIsStreaming(false)
  }, [activeFriendlyId, isNewChat, streamStop, stopStream])

  useLayoutEffect(() => {
    if (isNewChat) return
    const pending = consumePendingSend(
      forcedSessionKey || resolvedSessionKey || activeSessionKey,
      activeFriendlyId,
    )
    if (!pending) return
    pendingStartRef.current = true
    const historyKey = chatQueryKeys.history(
      pending.friendlyId,
      pending.sessionKey,
    )
    const cached = queryClient.getQueryData(historyKey) as
      | HistoryResponse
      | undefined
    const cachedMessages = Array.isArray(cached?.messages)
      ? cached.messages
      : []
    const alreadyHasOptimistic = cachedMessages.some((message) => {
      if (pending.optimisticMessage.clientId) {
        if (message.clientId === pending.optimisticMessage.clientId) return true
        if (message.__optimisticId === pending.optimisticMessage.clientId)
          return true
      }
      if (pending.optimisticMessage.__optimisticId) {
        if (message.__optimisticId === pending.optimisticMessage.__optimisticId)
          return true
      }
      return false
    })
    if (!alreadyHasOptimistic) {
      appendHistoryMessage(
        queryClient,
        pending.friendlyId,
        pending.sessionKey,
        pending.optimisticMessage,
      )
    }
    setWaitingForResponse(true)
    setPinToTop(true)
    sendMessage(pending.sessionKey, pending.friendlyId, pending.message, true, pending.attachments)
  }, [
    activeFriendlyId,
    activeSessionKey,
    forcedSessionKey,
    isNewChat,
    queryClient,
    resolvedSessionKey,
  ])

  function sendMessage(
    sessionKey: string,
    friendlyId: string,
    body: string,
    skipOptimistic = false,
    attachments?: AttachmentFile[],
    model?: string,
  ) {
    let optimisticClientId = ''
    if (!skipOptimistic) {
      const { clientId, optimisticMessage } = createOptimisticMessage(body, attachments)
      optimisticClientId = clientId
      appendHistoryMessage(
        queryClient,
        friendlyId,
        sessionKey,
        optimisticMessage,
      )
      updateSessionLastMessage(
        queryClient,
        sessionKey,
        friendlyId,
        optimisticMessage,
      )
    }

    setPendingGeneration(true)
    setSending(true)
    setError(null)
    setWaitingForResponse(true)
    setPinToTop(true)

    // Build attachments payload for API (Gateway expects mimeType + content)
    const attachmentsPayload = attachments?.map((a) => ({
      mimeType: a.file.type,
      content: a.base64,
    }))

    // Start SSE streaming BEFORE sending — events arrive immediately after chat.send
    startStream(sessionKey)
    streamStart()

    fetch('/api/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionKey,
        friendlyId,
        message: body,
        thinking: 'low',
        idempotencyKey: crypto.randomUUID(),
        attachments: attachmentsPayload,
        model: model || undefined,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res))
      })
      .catch((err) => {
        const messageText = err instanceof Error ? err.message : String(err)
        if (isMissingGatewayAuth(messageText)) {
          navigate({ to: '/connect', replace: true })
          return
        }
        if (optimisticClientId) {
          updateHistoryMessageByClientId(
            queryClient,
            friendlyId,
            sessionKey,
            optimisticClientId,
            function markFailed(message) {
              return { ...message, status: 'error' }
            },
          )
        }
        setError(`Failed to send message. ${messageText}`)
        setPendingGeneration(false)
        setWaitingForResponse(false)
        setPinToTop(false)
      })
      .finally(() => {
        setSending(false)
      })
  }

  const createSessionForMessage = useCallback(async () => {
    setCreatingSession(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(await readError(res))

      const data = (await res.json()) as {
        sessionKey?: string
        friendlyId?: string
      }

      const sessionKey =
        typeof data.sessionKey === 'string' ? data.sessionKey : ''
      const friendlyId =
        typeof data.friendlyId === 'string' && data.friendlyId.trim().length > 0
          ? data.friendlyId.trim()
          : deriveFriendlyIdFromKey(sessionKey)

      if (!sessionKey || !friendlyId) {
        throw new Error('Invalid session response')
      }

      queryClient.invalidateQueries({ queryKey: chatQueryKeys.sessions })
      return { sessionKey, friendlyId }
    } finally {
      setCreatingSession(false)
    }
  }, [queryClient])

  const send = useCallback(
    (body: string, helpers: ChatComposerHelpers) => {
      const attachments = helpers.attachments
      // Allow submit if there's text OR attachments
      if (body.length === 0 && (!attachments || attachments.length === 0)) return
      helpers.reset()

      if (isNewChat) {
        const { clientId, optimisticId, optimisticMessage } =
          createOptimisticMessage(body, attachments)
        appendHistoryMessage(queryClient, 'new', 'new', optimisticMessage)
        setPendingGeneration(true)
        setSending(true)
        setWaitingForResponse(true)
        setPinToTop(true)

        createSessionForMessage()
          .then(({ sessionKey, friendlyId }) => {
            setRecentSession(friendlyId)
            stashPendingSend({
              sessionKey,
              friendlyId,
              message: body,
              optimisticMessage,
              attachments,
            })
            if (onSessionResolved) {
              onSessionResolved({ sessionKey, friendlyId })
              return
            }
            navigate({
              to: '/chat/$sessionKey',
              params: { sessionKey: friendlyId },
              replace: true,
            })
          })
          .catch((err: unknown) => {
            removeHistoryMessageByClientId(
              queryClient,
              'new',
              'new',
              clientId,
              optimisticId,
            )
            helpers.setValue(body)
            setError(
              `Failed to create session. ${err instanceof Error ? err.message : String(err)}`,
            )
            setPendingGeneration(false)
            setWaitingForResponse(false)
            setPinToTop(false)
            setSending(false)
          })
        return
      }

      const sessionKeyForSend =
        forcedSessionKey || resolvedSessionKey || activeSessionKey
      sendMessage(sessionKeyForSend, activeFriendlyId, body, false, attachments, helpers.model)
    },
    [
      activeFriendlyId,
      activeSessionKey,
      createSessionForMessage,
      forcedSessionKey,
      isNewChat,
      navigate,
      onSessionResolved,
      queryClient,
      resolvedSessionKey,
    ],
  )

  const startNewChat = useCallback(() => {
    setWaitingForResponse(false)
    setPinToTop(false)
    clearHistoryMessages(queryClient, 'new', 'new')
    navigate({ to: '/new' })
    if (isMobile) {
      setChatUiState(queryClient, function collapse(state) {
        return { ...state, isSidebarCollapsed: true }
      })
    }
  }, [isMobile, navigate, queryClient])

  const handleToggleSidebarCollapse = useCallback(() => {
    setChatUiState(queryClient, function toggle(state) {
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed }
    })
  }, [queryClient])

  const handleSelectSession = useCallback(() => {
    if (!isMobile) return
    setChatUiState(queryClient, function collapse(state) {
      return { ...state, isSidebarCollapsed: true }
    })
  }, [isMobile, queryClient])

  const handleOpenSidebar = useCallback(() => {
    setChatUiState(queryClient, function open(state) {
      return { ...state, isSidebarCollapsed: false }
    })
  }, [queryClient])

  // Handle follow-up suggestion clicks - sends the suggestion as a new message
  const handleFollowUpClick = useCallback(
    (suggestion: string) => {
      if (isNewChat || !suggestion.trim()) return
      const sessionKeyForSend =
        forcedSessionKey || resolvedSessionKey || activeSessionKey
      if (!sessionKeyForSend) return
      sendMessage(sessionKeyForSend, activeFriendlyId, suggestion.trim())
    },
    [
      activeFriendlyId,
      activeSessionKey,
      forcedSessionKey,
      isNewChat,
      resolvedSessionKey,
    ],
  )

  // Keyboard shortcut handlers
  const handleFocusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const handleEscape = useCallback(() => {
    // Close shortcuts dialog if open
    if (showShortcutsHelp) {
      setShowShortcutsHelp(false)
      return
    }
    // Clear focus from input
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [showShortcutsHelp])

  const handleCopyLastResponse = useCallback(() => {
    // Find the last assistant message
    const lastAssistantMessage = [...displayMessages]
      .reverse()
      .find((msg) => msg.role === 'assistant')
    
    if (!lastAssistantMessage) return

    const textContent = textFromMessage(lastAssistantMessage)
    if (!textContent) return

    navigator.clipboard.writeText(textContent).catch(() => {
      // Silently fail - clipboard may not be available
    })
  }, [displayMessages])

  const handleShowHelp = useCallback(() => {
    setShowShortcutsHelp(true)
  }, [])

  const handleSearchCurrent = useCallback(() => {
    if (isNewChat) {
      // Can't search in a new chat, fall back to global
      setSearchMode('global')
    } else {
      setSearchMode('current')
    }
    setShowSearchDialog(true)
  }, [isNewChat])

  const handleSearchGlobal = useCallback(() => {
    setSearchMode('global')
    setShowSearchDialog(true)
  }, [])

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onNewChat: startNewChat,
    onFocusInput: handleFocusInput,
    onEscape: handleEscape,
    onCopyLastResponse: handleCopyLastResponse,
    onShowHelp: handleShowHelp,
    onSearch: handleSearchCurrent,
    onSearchGlobal: handleSearchGlobal,
  })

  const historyLoading =
    (historyQuery.isLoading && !historyQuery.data) || isRedirecting
  const showGatewayDown = Boolean(gatewayStatusError)
  const showGatewayNotice =
    showGatewayDown &&
    gatewayStatusQuery.errorUpdatedAt > gatewayStatusMountRef.current
  const historyEmpty = !historyLoading && displayMessages.length === 0
  const gatewayNotice = useMemo(() => {
    if (!showGatewayNotice) return null
    if (!gatewayError) return null
    return (
      <GatewayStatusMessage
        state="error"
        error={gatewayError}
        onRetry={handleGatewayRefetch}
      />
    )
  }, [gatewayError, handleGatewayRefetch, showGatewayNotice])

  const sidebar = (
    <ChatSidebar
      sessions={sessions}
      activeFriendlyId={activeFriendlyId}
      activeSessionKey={sessionKeyForHistory}
      creatingSession={creatingSession}
      onCreateSession={startNewChat}
      isCollapsed={isMobile ? false : isSidebarCollapsed}
      onToggleCollapse={handleToggleSidebarCollapse}
      onSelectSession={handleSelectSession}
      onActiveSessionDelete={handleActiveSessionDelete}
      onOpenSearch={handleSearchGlobal}
    />
  )

  return (
    <div className="h-screen bg-surface text-primary-900">
      <div
        className={cn(
          'h-full overflow-hidden',
          isMobile ? 'relative' : 'grid grid-cols-[auto_1fr]',
        )}
      >
        {hideUi ? null : isMobile ? (
          <>
            {/* Backdrop overlay when sidebar is open */}
            {!isSidebarCollapsed && (
              <div
                className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200"
                onClick={() =>
                  setChatUiState(queryClient, (state) => ({
                    ...state,
                    isSidebarCollapsed: true,
                  }))
                }
                {...sidebarCloseSwipeHandlers}
              />
            )}
            <div
              className={cn(
                'fixed inset-y-0 left-0 z-50 w-[300px] transition-transform duration-150 safe-area-top',
                isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0',
              )}
              {...sidebarCloseSwipeHandlers}
            >
              {sidebar}
            </div>
          </>
        ) : (
          sidebar
        )}

        <main
          className="flex flex-col h-full min-h-0"
          ref={mainRef}
          {...sidebarSwipeHandlers}
        >
          <ChatHeader
            activeTitle={activeTitle}
            wrapperRef={headerRef}
            showSidebarButton={isMobile}
            onOpenSidebar={handleOpenSidebar}
            totalTokens={activeTokens.totalTokens}
            contextTokens={activeTokens.contextTokens}
          />

          {hideUi ? null : (
            <>
              <ChatMessageList
                messages={messagesWithStreaming}
                loading={historyLoading}
                empty={historyEmpty}
                notice={gatewayNotice}
                noticePosition="end"
                waitingForResponse={waitingForResponse}
                isStreaming={isStreaming}
                sessionKey={activeCanonicalKey}
                pinToTop={pinToTop}
                pinGroupMinHeight={pinGroupMinHeight}
                headerHeight={headerHeight}
                contentStyle={stableContentStyle}
                onFollowUpClick={handleFollowUpClick}
              />
              <ChatComposer
                onSubmit={send}
                isLoading={sending}
                disabled={sending}
                wrapperRef={composerRef}
                inputRef={inputRef}
              />
            </>
          )}
        </main>
      </div>

      {showShortcutsHelp && (
        <Suspense fallback={null}>
          <KeyboardShortcutsDialog
            open={showShortcutsHelp}
            onOpenChange={setShowShortcutsHelp}
          />
        </Suspense>
      )}
      {showSearchDialog && (
        <Suspense fallback={null}>
          <SearchDialog
            open={showSearchDialog}
            onOpenChange={setShowSearchDialog}
            sessions={sessions}
            currentFriendlyId={activeFriendlyId}
            currentSessionKey={activeSessionKey}
            mode={searchMode}
            onJumpToMessage={(result: SearchResult) => {
              setShowSearchDialog(false)
              if (result.friendlyId) {
                navigate({ to: '/chat/$sessionKey', params: { sessionKey: result.friendlyId } })
              }
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
