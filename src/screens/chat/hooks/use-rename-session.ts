import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { chatQueryKeys } from '../chat-queries'
import { readError } from '../utils'

export type RenameSessionResult = {
  renameSession: (sessionKey: string, newTitle: string) => Promise<void>
  renaming: boolean
  error: string | null
}

export function useRenameSession(): RenameSessionResult {
  const queryClient = useQueryClient()
  const [renaming, setRenaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async function renameSessionRequest(payload: {
      sessionKey: string
      newTitle: string
    }) {
      const res = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionKey: payload.sessionKey,
          label: payload.newTitle,
        }),
      })
      if (!res.ok) throw new Error(await readError(res))
      return payload
    },
    onMutate: async function onMutate(payload) {
      setError(null)
      await queryClient.cancelQueries({ queryKey: chatQueryKeys.sessions })
      const previousSessions = queryClient.getQueryData(chatQueryKeys.sessions)

      // Optimistically update the session title in cache
      queryClient.setQueryData(
        chatQueryKeys.sessions,
        function update(sessions: unknown) {
          if (!Array.isArray(sessions)) return sessions
          return (
            sessions as Array<{ key: string; label?: string; title?: string }>
          ).map((session) => {
            if (session.key !== payload.sessionKey) return session
            return {
              ...session,
              label: payload.newTitle,
              title: payload.newTitle,
            }
          })
        },
      )

      return { previousSessions }
    },
    onError: function onError(err, _payload, context) {
      if (context?.previousSessions) {
        queryClient.setQueryData(
          chatQueryKeys.sessions,
          context.previousSessions,
        )
      }
      setError(err instanceof Error ? err.message : String(err))
    },
    onSuccess: function onSuccess() {
      // Invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.sessions })
    },
    onSettled: function onSettled() {
      setRenaming(false)
    },
  })

  const renameSession = useCallback(
    async (sessionKey: string, newTitle: string) => {
      if (!sessionKey || !newTitle.trim()) return
      setRenaming(true)
      await mutation.mutateAsync({ sessionKey, newTitle: newTitle.trim() })
    },
    [mutation],
  )

  return { renameSession, renaming, error }
}
