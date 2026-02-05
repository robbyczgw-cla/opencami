import { useMemo } from 'react'
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
  const sessionsQuery = useQuery({
    queryKey: chatQueryKeys.sessions,
    queryFn: fetchSessions,
    refetchInterval: 30000,
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

  return {
    sessionsQuery,
    sessions,
    activeSession,
    activeExists,
    activeSessionKey,
    activeTitle,
    sessionsError,
  }
}
