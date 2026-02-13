import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

const ENABLED_KEY = 'opencami-browser-notifications-enabled'
const ASKED_KEY = 'opencami-browser-notifications-permission-asked'
const NOTIFICATION_DEBOUNCE_MS = 5000

function isSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

export function useNotifications() {
  const navigate = useNavigate()
  const lastNotificationAtRef = useRef(0)
  const [enabled, setEnabledState] = useState<boolean>(() => getNotificationsEnabled())

  const requestPermission = useCallback(async () => {
    if (!isSupported()) return 'denied' as NotificationPermission
    try {
      return await Notification.requestPermission()
    } catch {
      return 'denied' as NotificationPermission
    }
  }, [])

  const setEnabled = useCallback(async (nextEnabled: boolean) => {
    setEnabledState(nextEnabled)
    try {
      localStorage.setItem(ENABLED_KEY, String(nextEnabled))
    } catch {
      // ignore storage errors
    }

    if (nextEnabled && isSupported() && Notification.permission === 'default') {
      await requestPermission()
      try {
        localStorage.setItem(ASKED_KEY, 'true')
      } catch {
        // ignore storage errors
      }
    }
  }, [requestPermission])

  const maybeNotifyAssistantMessage = useCallback((payload: {
    text: string
    sessionFriendlyId: string
  }) => {
    if (!enabled || !isSupported()) return
    if (document.hidden !== true) return
    if (Notification.permission !== 'granted') return

    const now = Date.now()
    if (now - lastNotificationAtRef.current < NOTIFICATION_DEBOUNCE_MS) return
    lastNotificationAtRef.current = now

    const body = payload.text.slice(0, 100)
    const notification = new Notification('OpenCami', {
      body,
      icon: '/pwa-192x192.png',
    })

    notification.onclick = () => {
      window.focus()
      void navigate({ to: '/chat/$sessionKey', params: { sessionKey: payload.sessionFriendlyId } })
      notification.close()
    }
  }, [enabled, navigate])

  useEffect(() => {
    if (!isSupported()) return

    const onFirstInteraction = () => {
      if (Notification.permission !== 'default') return
      let asked = false
      try {
        asked = localStorage.getItem(ASKED_KEY) === 'true'
      } catch {
        asked = false
      }
      if (asked) return

      void requestPermission().finally(() => {
        try {
          localStorage.setItem(ASKED_KEY, 'true')
        } catch {
          // ignore storage errors
        }
      })
    }

    const options: AddEventListenerOptions = { once: true, passive: true }
    window.addEventListener('pointerdown', onFirstInteraction, options)
    window.addEventListener('keydown', onFirstInteraction, { once: true })

    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction)
      window.removeEventListener('keydown', onFirstInteraction)
    }
  }, [requestPermission])

  useEffect(() => {
    const sync = () => setEnabledState(getNotificationsEnabled())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  return {
    notificationsEnabled: enabled,
    setNotificationsEnabled: setEnabled,
    requestNotificationPermission: requestPermission,
    maybeNotifyAssistantMessage,
  }
}
