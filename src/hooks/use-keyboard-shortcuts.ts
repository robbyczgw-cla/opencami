import { useEffect, useCallback } from 'react'

type KeyboardShortcutHandlers = {
  onNewChat?: () => void
  onFocusInput?: () => void
  onEscape?: () => void
  onCopyLastResponse?: () => void
  onShowHelp?: () => void
  onSearch?: () => void
  onSearchGlobal?: () => void
}

/**
 * Custom hook for managing global keyboard shortcuts
 * Handles both Mac (⌘) and Windows/Linux (Ctrl) modifiers
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields, textareas, or contenteditable elements
      const target = event.target as HTMLElement
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // Exception: Escape should work everywhere
      if (event.key === 'Escape') {
        handlers.onEscape?.()
        return
      }

      // Exception: ? should work when not in an input field
      if (event.key === '?' && !isInputField && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        handlers.onShowHelp?.()
        return
      }

      // Skip other shortcuts if in an input field
      if (isInputField) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifierKey = isMac ? event.metaKey : event.ctrlKey

      // ⌘/Ctrl + K → New chat
      if (modifierKey && event.key === 'k' && !event.shiftKey) {
        event.preventDefault()
        handlers.onNewChat?.()
        return
      }

      // ⌘/Ctrl + / → Focus input
      if (modifierKey && event.key === '/') {
        event.preventDefault()
        handlers.onFocusInput?.()
        return
      }

      // ⌘/Ctrl + Shift + C → Copy last response
      if (modifierKey && event.shiftKey && event.key === 'C') {
        event.preventDefault()
        handlers.onCopyLastResponse?.()
        return
      }

      // ⌘/Ctrl + F → Search current conversation
      if (modifierKey && event.key === 'f' && !event.shiftKey) {
        event.preventDefault()
        handlers.onSearch?.()
        return
      }

      // ⌘/Ctrl + Shift + F → Search all conversations (global)
      if (modifierKey && event.shiftKey && event.key === 'F') {
        event.preventDefault()
        handlers.onSearchGlobal?.()
        return
      }
    },
    [handlers],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
