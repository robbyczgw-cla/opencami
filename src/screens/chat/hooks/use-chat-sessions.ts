import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { chatQueryKeys, fetchSessions } from '../chat-queries'
import { isRecentSession } from '../pending-send'
import { filterSessionsWithTombstones } from '../session-tombstones'

type UseChatSessionsInput = {
  activeFriendlyId: string
  isNewChat: boolean
  forcedSessionKey?: string
}

export function useChatSessions({
  activeFriendlyId,
  isNewChat,
  forcedSessionKey,
}: UseChatSessionsInput) {
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => {
    if (typeof document === 'undefined') return true
    return document.visibilityState === 'visible'
  })

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState === 'visible')
    }

    handleVisibilityChange()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const sessionsQuery = useQuery({
    queryKey: chatQueryKeys.sessions,
    queryFn: fetchSessions,
    refetchInterval: isDocumentVisible ? 30000 : false,
  })

  const sessions = useMemo(() => {
    const rawSessions = sessionsQuery.data ?? []
    return filterSessionsWithTombstones(rawSessions)
  }, [sessionsQuery.data])

  const activeSession = useMemo(() => {
    return sessions.find((session) => session.friendlyId === activeFriendlyId)
  }, [sessions, activeFriendlyId])
  const activeExists = useMemo(() => {
    if (isNewChat) return true
    if (forcedSessionKey) return true
    if (isRecentSession(activeFriendlyId)) return true
    return sessions.some((session) => session.friendlyId === activeFriendlyId)
  }, [activeFriendlyId, forcedSessionKey, isNewChat, sessions])
  const activeSessionKey = activeSession?.key ?? ''
  const activeTitle = useMemo(() => {
    if (activeSession) {
      return (
        activeSession.label ||
        activeSession.title ||
        activeSession.derivedTitle ||
        activeSession.friendlyId
      )
    }
    return activeFriendlyId
  }, [activeFriendlyId, activeSession])

  const sessionsError =
    sessionsQuery.error instanceof Error ? sessionsQuery.error.message : null

  const activeTokens = useMemo(() => {
    return {
      totalTokens: activeSession?.totalTokens,
      contextTokens: activeSession?.contextTokens,
    }
  }, [activeSession?.totalTokens, activeSession?.contextTokens])

  return {
    sessionsQuery,
    sessions,
    activeSession,
    activeExists,
    activeSessionKey,
    activeTitle,
    activeTokens,
    sessionsError,
  }
}
